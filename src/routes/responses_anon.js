const debug = require("debug")("kk:responses-anon");

const express = require("express");

const router = express.Router();

const _ = require("lodash");
const moment = require("moment");
const uuid = require("uuid/v4");

const cloudTasks = require("@google-cloud/tasks");

const cloudTasksClient = new cloudTasks.CloudTasksClient();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GCP_LOCATION;

const nlpQueueId = process.env.NLP_QUEUE_ID;

const createTaskNlpParent = cloudTasksClient.queuePath(projectId, location, nlpQueueId);

const Response = require("../models/response");

const knex = Response.knex();

const {
    createResponseCountAggregationTask,
    insertResponses,
    createIdeaLangDetectTask,
} = require("./responses");

const {
    InvalidParamsError,
    errorHandler,
} = require("../utils/errorHandler");

// similar to createNlpFanoutTask in responses.js, but for a single response
// does what the /fanout endpoint does in nlp.js (queues a  "process response" task)
const createNlpProcessTask = async function (responseIds, expressRequest) { // eslint-disable-line func-names
    if (responseIds.length === 0) {
        return;
    }

    const responseId = responseIds[0];

    try {
        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: `/tasks/nlp/process/${responseId}`,
                appEngineRouting: {
                    service: "api",
                },
            },
        };

        const cloudTaskRequest = {
            parent: createTaskNlpParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createNlpProcessTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        expressRequest.log.error(err);
        // we don't rethrow because this is not a significant enough failure to warrant a failure response - we can
        // always queue the NLP work later
    }
};

router.post("/form/", async (req, res) => {
    try {
        if (_.isEmpty(req.body) || !req.body.location_id || !req.body.satisfied || !req.body.idea) {
            throw new InvalidParamsError("Create response form post", "Missing data");
        }

        const formServicePoint = await knex("service_points")
            .where("settlement_id", req.body.location_id)
            .andWhere("name", "Form")
            .first();

        const responses = [{
            service_point_id: parseInt(formServicePoint.id, 10),
            satisfied: req.body.satisfied.toLowerCase() === "true",
            idea: req.body.idea,
            created_at: moment().format(),
            unique_id: uuid(),
        }];

        const user = await knex("users").where("email", "form@kujakuja.com").first();

        const [insertedResponseIdsWithIdeas, insertedResponseIdsWithoutIdeas] = await insertResponses(responses, user);

        const { homework } = req.body;
        if (homework) {
            const homeworkTag = homework.toLowerCase() === "true" ? "homework" : "nohomework";
            const tag = {
                name: homeworkTag,
                response_id: insertedResponseIdsWithIdeas[0],
            };
            await knex.transaction(async (trx) => {
                const [tagId] = await knex("tags")
                    .transacting(trx)
                    .insert(tag)
                    .returning("id");
                // insert into tag_actors table
                const [tagActorId] = await knex("tag_actors")
                    .transacting(trx)
                    .insert({
                        actor_entity_type: "response",
                        actor_entity_id: insertedResponseIdsWithIdeas.length > 0 ? insertedResponseIdsWithIdeas[0]
                            : insertedResponseIdsWithoutIdeas[0],
                    }).returning("id");
                // insert into provenance table
                return knex("provenance")
                    .transacting(trx)
                    .insert({
                        tag_id: tagId,
                        tag_actor_id: tagActorId,
                        action_uuid: uuid(),
                    });
            });
        }

        const stats = {
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            referrer: req.header("Referer"),
            country: req.header("X-AppEngine-Country"),
            region: req.header("X-AppEngine-Region"),
            city: req.header("X-AppEngine-City"),
            city_coords: req.header("X-AppEngine-CityLatLong"),
            related_entity_type: "responses",
            related_entity_id: insertedResponseIdsWithIdeas.length > 0 ? insertedResponseIdsWithIdeas[0]
                : insertedResponseIdsWithoutIdeas[0],
        };
        await knex("api_stats").insert(stats);

        await createNlpProcessTask(insertedResponseIdsWithIdeas, req);
        await createResponseCountAggregationTask(req);
        await createIdeaLangDetectTask(insertedResponseIdsWithIdeas, req);

        res.redirect(req.body.redirect_url);
    }
    catch (err) {
        if (err instanceof Response.ValidationError) {
            debug("Create responses error : Invalid data(422)");
            res.status(422).json({ error: err.data });
        }
        else {
            errorHandler(err, res, req);
        }
    }
});

module.exports = router;
