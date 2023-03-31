const express = require("express");
const uuid = require("uuid");
const { retrieveVectorisationLanguage } = require("../responses");

const router = express.Router();
const knex = require("../../knex");
const {
    errorHandler,
} = require("../../utils/errorHandler");
const { sendMessageToSlack } = require("./slack_helpers");
const { syndicationCloudTaskRunner } = require("./cloud_tasks_runner");

const { SLACK_CHANNEL_ID, GOOGLE_CLOUD_PROJECT } = process.env;

const insertTagAndActorAndProvenanceData = (tagFilterId, uid) => {
    const tsVectorLanguage = retrieveVectorisationLanguage();
    return knex.transaction(async (trx) => {
        return knex.raw(`
    WITH new_actor AS (
        -- create a new actor if missing
        INSERT INTO tag_actors (actor_entity_type, actor_entity_id)
        SELECT 'FILTER', :tagFilterId
        WHERE NOT EXISTS (SELECT * FROM tag_actors WHERE actor_entity_type = 'FILTER' AND actor_entity_id = :tagFilterId)
        RETURNING *
        ), tag_action AS (
        SELECT id AS actor_id, :uid AS UUID FROM new_actor
        UNION
        SELECT id AS actor_id, :uid FROM tag_actors WHERE actor_entity_type = 'FILTER' AND actor_entity_id = :tagFilterId
        ), untagged AS (
        -- get data for untagged responses to tag
        SELECT r.id AS response_id, f.tag_text, t.id AS tag_id
        -- tag_id present -> the idea is already tagged and just needs provenance
        FROM
        tag_filters f

        --check against settlements
        LEFT JOIN tag_filter_settlements tfs ON tfs.tag_filter_id = f.id
        INNER JOIN settlements s ON tfs.settlement_id IS NULL OR tfs.settlement_id=s.id
        INNER JOIN service_points sp ON sp.settlement_id = s.id

        -- core ts_vector search match
        INNER JOIN responses r
        ON r.idea_token_vector @@ to_tsquery(:tsVectorLanguage, f.search_text) AND r.service_point_id = sp.id

        -- check against existing tags
        LEFT JOIN tags t
        ON t.response_id = r.id AND t."name" = f.tag_text

        -- who is the actor
        LEFT JOIN tag_actors a
        ON a.actor_entity_type='FILTER' AND CAST(a.actor_entity_id AS int) = f.id

        -- ask the question: has this tag been applied by this actor
        LEFT JOIN tag_provenance p
        ON p.tag_id = t.id AND p.tag_actor_id = a.id

        -- if this actor isn't recorded in the tag provenance yet
        WHERE p.id IS NULL

        -- and we match the filter date criteria
        AND (f.start_date IS NULL OR f.start_date <= r.created_at)
        AND (f.end_date IS NULL OR f.end_date >= r.created_at)

        -- and match the filter by last run at criteria
        AND (f.last_run_at IS NULL OR (f.updated_at < f.last_run_at AND f.last_run_at < r.uploaded_at))

        -- for the current tag_filter
        AND f.id = :tagFilterId
        ),
        just_tagged AS (
        -- insert new tags where they don't already exist
        INSERT INTO tags(response_id, name) SELECT response_id, tag_text FROM untagged WHERE tag_id IS NULL
        RETURNING id, response_id, name
        ), new_provenance AS (
        -- insert missing tag provenance for new / existing tags
        INSERT INTO tag_provenance(tag_id, tag_actor_id,action_uuid)
        SELECT coalesce(u.tag_id,j.id) AS tag_id, tag_action.actor_id, tag_action.uuid
        FROM untagged u LEFT JOIN just_tagged j ON u.response_id = j.response_id LEFT JOIN tag_action ON true
        RETURNING *)
        SELECT COUNT(1) FROM new_provenance;
        `, {
            tagFilterId,
            uid,
            tsVectorLanguage,
        })
            .transacting(trx);
    });
};

const performBulkTaggingOnSingleTagFilter = async (tagFilterId, uid = null) => {
    const bulkUid = uid || uuid();
    await insertTagAndActorAndProvenanceData(tagFilterId, bulkUid);
    await knex("tag_filters")
        .where("id", tagFilterId)
        .update("status", "ACTIVE");
};

const tagSingleFilterInQueuedState = async (tagFilterId, bulkUuid, threadTs) => {
    const [tagFilterText] = await knex("tag_filters")
        .where("id", tagFilterId)
        .pluck("tag_text");
    try {
        await knex("tag_filters")
            .where("id", tagFilterId)
            .update("status", "PROCESSING");
        await performBulkTaggingOnSingleTagFilter(tagFilterId, bulkUuid);
        await sendMessageToSlack("Bulk Tag", `Tagging complete: filter id ${tagFilterId}: #${tagFilterText} (${GOOGLE_CLOUD_PROJECT}) :heavy_check_mark:`, SLACK_CHANNEL_ID, threadTs);
    }
    catch (e) {
        await knex("tag_filters")
            .whereIn("id", tagFilterId)
            .update("status", "ERROR");
        await sendMessageToSlack("Bulk Tag", `Error tagging filter id ${tagFilterId}: #${tagFilterText} (${GOOGLE_CLOUD_PROJECT}) :heavy_multiplication_x:`, SLACK_CHANNEL_ID, threadTs);
    }
};

const performBulkTaggingOnAllQueuedFilters = async (threadTs) => {
    const tagFilterIds = await knex("tag_filters")
        .pluck("id")
        .where("status", "QUEUED");
    const bulkUuid = uuid();
    const promises = [];
    tagFilterIds.forEach((tagFilterId) => {
        promises.push(tagSingleFilterInQueuedState(tagFilterId, bulkUuid, threadTs));
    });
    await Promise.all(promises);
};

router.get("/daily_bulk_tag", async (req, res) => {
    try {
        // do not proceed if one of more tag filters already in QUEUED state
        const [tagFilter] = await knex("tag_filters")
            .where("status", "QUEUED");
        if (tagFilter) {
            await syndicationCloudTaskRunner.reQueueTask();
            res.status(200).end();
            return;
        }
        await syndicationCloudTaskRunner.sendSlackMessage("*Bulk Tagging* :label:", "Bulk Tag");

        // do not proceed if there are no filters to process
        const tagsAwaitingProcessing = await knex("tag_filters")
            .where("status", "ACTIVE")
            .orWhere("status", "EDITING");

        if (!tagsAwaitingProcessing || !tagsAwaitingProcessing.length) {
            await syndicationCloudTaskRunner.sendSlackMessage(`- bulk tagging complete :heavy_check_mark:`, "Bulk Tag");
            await syndicationCloudTaskRunner.taskDone({}, 0);
            res.status(200).end();
            return;
        }

        await syndicationCloudTaskRunner.sendSlackMessage(`Performing daily bulk tagging of all filters`, "Bulk Tag");
        await knex("tag_filters")
            .where("status", "ACTIVE")
            .orWhere("status", "EDITING")
            .update("status", "QUEUED");

        await performBulkTaggingOnAllQueuedFilters(syndicationCloudTaskRunner.getSlackTreadTs());
        await syndicationCloudTaskRunner.sendSlackMessage(`- bulk tagging complete :heavy_check_mark:`, "Bulk Tag");
        await syndicationCloudTaskRunner.taskDone({}, 0);
        res.status(200).end();
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// POST bulk_tag
// Description: performs bulk tagging for all tag filters in QUEUED state.
router.post("/bulk_tag", async (req, res) => {
    req.connection.setTimeout(600000); // 10 minute timeout
    try {
        //'threadTs' (standing for 'time stamp') is the unique identifier of slack thread's parent message
        const { threadTs } = JSON.parse(Buffer.from(req.body, "base64").toString());
        await performBulkTaggingOnAllQueuedFilters(threadTs);
        await sendMessageToSlack("Bulk Tag", `Bulk tagging COMPLETE (${GOOGLE_CLOUD_PROJECT})`, SLACK_CHANNEL_ID, threadTs);
        res.status(200).end();
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET bulk_tag/:id
// Description: performs bulk tagging of responses for single tag filter record.
router.get("/bulk_tag/:id([0-9]+)", async (req, res) => {
    req.connection.setTimeout(600000); // 10 minute timeout
    const { id } = req.params;
    const [tagFilterText] = await knex("tag_filters")
        .where("id", id)
        .pluck("tag_text");
    const slackMessage = await sendMessageToSlack("Bulk Tag",
        `Applying tag filter id ${id}: #${tagFilterText} (${GOOGLE_CLOUD_PROJECT})`,
        SLACK_CHANNEL_ID);
    try {
        await performBulkTaggingOnSingleTagFilter(id);
        await sendMessageToSlack("Bulk Tag",
            "Applied :heavy_check_mark:",
            SLACK_CHANNEL_ID, slackMessage.message.ts);
        res.status(200).end();
    }
    catch (error) {
        await knex("tag_filters")
            .where("id", id)
            .update("status", "ERROR");
        await sendMessageToSlack("Bulk Tag",
            `Error applying tag filter id ${id}: #${tagFilterText} :heavy_multiplication_x:`,
            SLACK_CHANNEL_ID, slackMessage.message.ts);
        errorHandler(error, req);
    }
});

// GET bulk_tag/undo/:id
// Description: undoes bulk tagging of responses for a single tag filter.
router.get("/bulk_tag/undo/:id([0-9]+)", async (req, res) => {
    req.connection.setTimeout(300000); // 5 minute timeout
    const { id } = req.params;
    const [tagFilterText] = await knex("tag_filters")
        .where("id", id)
        .pluck("tag_text");
    const slackMessage = await sendMessageToSlack("Bulk Tag", `Undoing tag filter id ${id}: #${tagFilterText} (${GOOGLE_CLOUD_PROJECT})`, SLACK_CHANNEL_ID);

    try {
        const tagActorsIdsToDelete = await knex("tag_actors")
            .where("actor_entity_type", "FILTER")
            .andWhere("actor_entity_id", id)
            .pluck("id");
        const provenanceIdsToDelete = await knex("tag_provenance")
            .whereIn("tag_actor_id", tagActorsIdsToDelete)
            .pluck("id");
        let tagIdsToDelete = await knex("tag_provenance")
            .whereIn("id", provenanceIdsToDelete)
            .pluck("tag_id");
        // DO NOT delete tags that are also associated with OTHER provenance
        const tagIdsNotToDelete = await knex("tag_provenance")
            .whereNotIn("id", provenanceIdsToDelete)
            .andWhereRaw('tag_id = ANY(:tagIdsToDelete)', { tagIdsToDelete })
            .pluck("tag_id");
        if (tagIdsNotToDelete && tagIdsNotToDelete.length) {
            tagIdsToDelete = tagIdsToDelete.filter((tagId) => !tagIdsNotToDelete.includes(tagId));
        }

        await knex.transaction(async (trx) => {
            await trx("tag_provenance")
                .whereIn("id", provenanceIdsToDelete)
                .delete();
            await trx("tag_actors")
                .whereIn("id", tagActorsIdsToDelete)
                .delete();
            await trx("tags")
                .whereIn("id", tagIdsToDelete)
                .delete();
            await trx("tag_filters")
                .where("id", id)
                .update("status", "EDITING");
        });
        await sendMessageToSlack("Bulk Tag", "Undo complete :heavy_check_mark:",
            SLACK_CHANNEL_ID,
            slackMessage.message.ts);
        res.status(200).end();
    }
    catch (error) {
        await knex("tag_filters")
            .where("id", id)
            .update("status", "ERROR");
        await sendMessageToSlack("Bulk Tag", `Error undoing tag filter id ${id}: #${tagFilterText} :heavy_multiplication_x:`, SLACK_CHANNEL_ID, slackMessage.message.ts);
        errorHandler(error, res, req);
    }
});

module.exports = router;
