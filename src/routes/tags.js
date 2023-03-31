const express = require("express");
const moment = require("moment");
const _ = require("lodash");
const uuid = require("uuid");
const { validate } = require("jsonschema");

const router = express.Router();
const knex = require("../knex");
const createCloudTask = require("./task_handlers/cloud_tasks_helpers");
const schema = require("../models/tag_filters");

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");
const { sendMessageToSlack } = require("./task_handlers/slack_helpers");

const { TAGGING_QUEUE_ID, SLACK_CHANNEL_ID, GOOGLE_CLOUD_PROJECT } = process.env;

// GET /tags
// Description: Get all distinct tags.
router.get("/", async (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Get tags");
        }
        const tags = await knex("tags").select("tags.name").distinct("name").orderBy("name", "asc");
        res.status(200).send({ data: tags });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET /tag_filters
// Description: Get all tag filters.
router.get("/tag_filters", async (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Get tag filters");
        }
        const tagFilters = await knex("tag_filters").select().orderBy("tag_text", "asc");
        res.status(200).send({ data: tagFilters });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET bulk-tag
// Description: bulk tags all the responses with tag-filters
router.get("/bulk_tag", async (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Bulk tag");
        }
        const [tagFilter] = await knex("tag_filters").where("status", "QUEUED");
        if (tagFilter) {
            throw new InvalidParamsError("Bulk tag", "Tagging in progress. Please try again later");
        }
        const slackResponse = await sendMessageToSlack("Bulk tagging", `Bulk tagging all filters (${GOOGLE_CLOUD_PROJECT}) :label:`, SLACK_CHANNEL_ID);
        const threadTs = slackResponse.message.ts;

        await knex("tag_filters")
            .where("status", "ACTIVE")
            .orWhere("status", "EDITING")
            .update("status", "QUEUED");

        await createCloudTask(TAGGING_QUEUE_ID, "POST", "/tasks/tag/bulk_tag", { threadTs }, 0);
        res.status(200).end();
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET bulk-tag/:id
// Description: bulk tag all the responses with a specific tag-filter
router.get("/bulk_tag/:id([0-9]+)", async (req, res) => {
    const { id } = req.params;

    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Get single tag filter");
        }
        const [tagFilter] = await knex("tag_filters").where("id", id);

        if (tagFilter && tagFilter.status && (tagFilter.status === "ACTIVE" || tagFilter.status === "EDITING")) {
            await knex("tag_filters").where("id", id).update("status", "PROCESSING");
            await createCloudTask(TAGGING_QUEUE_ID, "GET", `/tasks/tag/bulk_tag/${id}`, null, 0);
            res.status(200).end();
        }
        else {
            throw new Error("Tag filter cannot be ACTIVE");
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET  bulk_tag/undo/:tag_filter_id
// Description Undo all the tagging done by the tag filter of the specified ID
router.get("/bulk_tag/undo/:id([0-9]+)", async (req, res) => {
    const { id } = req.params;

    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Undo bulk tag");
        }
        const [tagFilter] = await knex("tag_filters").where("id", id);

        if (tagFilter && tagFilter.status && tagFilter.status === "ACTIVE") {
            await knex("tag_filters").where("id", id).update("status", "PROCESSING");
            await createCloudTask(TAGGING_QUEUE_ID, "GET", `/tasks/tag/bulk_tag/undo/${id}`, null, 0);
            res.status(200).end();
        }
        else {
            throw new InvalidParamsError("Undo bulk tag", "Tag filter cannot be undone.");
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET tags
// Description: Get tagfilter from id.
router.get("/tag_filters/:id([0-9]+)", async (req, res) => {
    const { id } = req.params;
    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Get single tag filter");
        }
        const [tag] = await knex("tag_filters")
            .leftJoin("tag_filter_settlements", "tag_filter_settlements.tag_filter_id", "tag_filters.id")
            .leftJoin("settlements", "settlements.id", "tag_filter_settlements.settlement_id")
            .where("tag_filters.id", id)
            .select("tag_filters.*", knex.raw("ARRAY_TO_STRING(ARRAY_AGG(settlements.name), ', ') AS locations"))
            .groupBy("tag_filters.id");
        res.status(200).send({ data: tag });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// POST /tag_filters
// Description: Add tag filters.
router.post("/tag_filters", (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Post tag filters");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create tag filter", "Missing data");
        }

        const tagFilter = req.body;
        delete tagFilter.created_at;
        delete tagFilter.updated_at;
        !tagFilter.start_date && delete tagFilter.start_date;
        !tagFilter.end_date && delete tagFilter.end_date;

        const validationResult = validate(tagFilter, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create tag filter", validationResult.errors);
        }

        knex("tag_filters")
            .insert(tagFilter)
            .returning("id")
            .then((result) => {
                res.status(200).json(
                    {
                        id: parseInt(result[0], 10),
                        state: "created",
                    },
                );
            })
            .catch((err) => {
                req.log.error(err);
                res.status(500).end();
            });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// POST /tags
// Description: Create a new tag for a response
// @@ POST params @@
// response_id (integer) : required => id of the response
// tag (string) : required => name of the tag
router.post("/", async (req, res) => {
    try {
        const { response_id, tag } = req.body; // eslint-disable-line camelcase

        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Create tag");
        }

        if (!response_id || !tag) { // eslint-disable-line camelcase
            throw new InvalidParamsError("Create tag", "Missing 'tag' and/or 'response_id' parameters");
        }

        await knex.transaction(async (trx) => {
            const tagExists = await knex("tags")
                .transacting(trx)
                .select("name")
                .whereRaw(`lower(name) = trim(lower(:tag))`, { tag })
                .andWhere("response_id", response_id)
                .first();

            if (!tagExists) {
                const insertedTagId = await knex("tags")
                    .transacting(trx)
                    .insert(
                        {
                            name: tag.trim(),
                            response_id: response_id,
                        },
                    )
                    .returning("id");

                // insert into tag_actors table
                const tagActorId = await knex("tag_actors")
                    .transacting(trx)
                    .insert({
                        actor_entity_type: "user",
                        actor_entity_id: req.user.id,
                    }).returning("id");
                // insert into provenance table
                return knex("tag_provenance")
                    .transacting(trx)
                    .insert({
                        tag_id: insertedTagId[0],
                        tag_actor_id: tagActorId[0],
                        action_uuid: uuid(),
                    });
            }
        });

        res.status(200).end();
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

/**
 * DELETE tags
 * Description: Delete tag for a response
 * @param {Number} response_id : required => id of the response
 * @param {String} tag : required => name of the tag
 */
router.delete("/:id([0-9]+)", async (req, res) => {
    try {
        const { tag } = req.body;
        const { id } = req.params;

        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Delete tag");
        }

        if (!tag) {
            throw new InvalidParamsError("Delete tag", "Missing 'tag' parameter");
        }

        await knex.transaction(async (trx) => {
            const tagToDelete = await knex("tags")
                .transacting(trx)
                .where("response_id", id)
                .andWhere("name", tag)
                .first();

            const tagProvenanceToDelete = await knex("tag_provenance").transacting(trx).where("tag_id", tagToDelete.id).first();
            const tagActorToDelete = await knex("tag_actors").transacting(trx).where("id", tagProvenanceToDelete.tag_actor_id).first();

            if (tagActorToDelete.actor_entity_type === "user" && tagActorToDelete.actor_entity_id === req.user.id) {
                await knex("tag_actors").transacting(trx).where("id", tagProvenanceToDelete.tag_actor_id).delete();
                await knex("tag_provenance").transacting(trx).where("tag_id", tagToDelete.id).delete();
                await knex("tags").transacting(trx).where("response_id", id).andWhere("name", tag).delete();

                res.status(200).send({ status: "deleted", id: id.toString() });
            }
            else {
                throw new Error("Cannot delete tag. Tag added by tag filter");
            }
        });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// PUT tag-filters
// Description: Update tag filter from id.
router.put("/tag_filters/:id([0-9]+)", async (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update tag filter", "Missing data");
        }

        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Update tag filter");
        }

        // eslint-disable-next-line camelcase
        const { created_at, ...tagFilter } = req.body;
        const { id } = req.params;
        tagFilter.updated_at = moment().format();
        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Update tag filter");
        }
        const [tag] = await knex("tag_filters").where("id", id);

        if (tag.status === "EDITING") {
            await knex("tag_filters")
                .where("id", id)
                .update(tagFilter);
            res.status(200).send({ status: "updated", id: tag.id.toString() });
        }
        else {
            throw new Error("Tag Filter cannot be edited");
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// DELETE tag-filters
// Description: Delete tag filter with specified id.
router.delete("/tag_filters/:id([0-9]+)", async (req, res) => {
    try {
        const { id } = req.params;

        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Delete tag filter");
        }

        const [tag] = await knex("tag_filters").where("id", id);

        if (tag.status === "EDITING") {
            await knex("tag_filters").where("id", id).delete();
            res.status(200).send({ status: "deleted", id: tag.id.toString() });
        }
        else {
            throw new Error("Tag Filter cannot be deleted");
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

module.exports = router;
