const debug = require("debug")("kk:task_handlers:nlp");

const express = require("express");

const router = express.Router();

const { transaction } = require("objection");
const _ = require("lodash");
const moment = require("moment");

const cloudTasks = require("@google-cloud/tasks");
const cloudNaturalLanguage = require("@google-cloud/language");
const { Translate } = require("@google-cloud/translate").v2;

const cloudTasksClient = new cloudTasks.CloudTasksClient();
const cloudNaturalLanguageClient = new cloudNaturalLanguage.LanguageServiceClient();
const translate = new Translate();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GCP_LOCATION;

const queueId = process.env.NLP_QUEUE_ID;

const createTaskParent = cloudTasksClient.queuePath(projectId, location, queueId);

const Response = require("../../models/response");
const Adjective = require("../../models/adjective");
const GCloudNLAPIResponse = require("../../models/gcloud_nl_api_response");

const knex = Response.knex();

router.post("/fanout", async function (req, res, next) {
    try {
        req.log.info(`NLP fanout handler received task with payload: ${req.body}`);

        let responseIds = JSON.parse(Buffer.from(req.body, "base64").toString());

        await Promise.all(_.map(responseIds, async function (responseId) {
            let cloudTask = {
                appEngineHttpRequest: {
                    httpMethod: "POST",
                    relativeUri: `/tasks/nlp/process/${responseId}`,
                    appEngineRouting: {
                        service: "api"
                    }
                }
            };

            let cloudTaskRequest = {
                parent: createTaskParent,
                task: cloudTask
            };

            let createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
            let taskName = createTaskResponse[0].name;
            req.log.info(`NLP fanout handler created task: ${taskName}`);
        }));

        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

router.post("/process/:responseId", async function (req, res, next) {
    try {
        let responseId = parseInt(req.params.responseId, 10);

        await transaction(knex, async (trx) => {
            let response = await Response.query(trx).findById(responseId);
            response.id = parseInt(response.id, 10); // otherwise validation fails on the .$relatedQuery('adjectives', trx).relate call, see https://knexjs.org/#Schema-bigInteger

            let cloudNaturalLanguageRequest = {
                document: {
                    content: response.idea,
                    type: "PLAIN_TEXT"
                },
                encodingType: "UTF8"
            };

            let analyzeSyntaxResponse = await cloudNaturalLanguageClient.analyzeSyntax(cloudNaturalLanguageRequest);

            await response.$relatedQuery("gcloud_nl_api_responses", trx)
                .insert({
                    analysis_type: "syntax",
                    api_response: analyzeSyntaxResponse
                });

            let adjectiveCounts = {};

            _.forEach(analyzeSyntaxResponse[0].tokens, function(token) {
                if (token.partOfSpeech.tag === "ADJ") {
                    let lowerCaseAdjective = token.lemma.toLowerCase(); // force lowercase to avoid duplicate adjectives in the DB
                    if (!adjectiveCounts.hasOwnProperty(lowerCaseAdjective)) {
                        adjectiveCounts[lowerCaseAdjective] = 0;
                    }
                    adjectiveCounts[lowerCaseAdjective] += 1;
                }
            });

            await Promise.all(_.map(adjectiveCounts, async function (count, adjective) {
                let adjectiveId = await findOrCreateAdjective(adjective, trx);
                adjectiveId = parseInt(adjectiveId, 10);

                // need returning('*') here because otherwise it defaults to returning('id'), but the join table doesn't have an 'id' column
                await response.$relatedQuery("adjectives", trx)
                    .relate({id: adjectiveId, count: count}).returning("*");
            }));

            let now = moment().format();

            let promise = response.$query(trx).patch({
                nlp_extract_adjectives_processed: true,
                updated_at: now
            });

            // the transaction is committed if this promise resolves
            // if this promise is rejected or an error is thrown inside of this callback function, the transaction is rolled back
            return promise;
        });

        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

router.post("/idea_lng_detect", async (req, res, next) => {
    try {
        req.log.info(`Idea language detect handler received task with payload: ${req.body}`);

        const responseIds = JSON.parse(Buffer.from(req.body, "base64").toString());
        const responses = await knex("responses").select("id", "idea").whereIn("id", responseIds);
        const ideas = responses.map((response) => response.idea);
        const [detections] = await translate.detect(ideas);

        detections.forEach((detection, index) => {
            if (detection.language) {
                knex("responses").where("id", responses[index].id).update({ idea_language: detection.language })
                    .then(() => {
                        req.log.info("Success updating idea language");
                    })
                    .catch((error) => {
                        debug(error);
                        req.log.error(error, "Error updating idea language");
                    });
            }
        });
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

let findOrCreateAdjective = async function(name, trx) {
    let adjective = await Adjective.query(trx).where("name", name).first();
    if (!adjective) {
        adjective = await Adjective.query(trx).insert({name: name});
    }
    return adjective.id;
};

module.exports = router;
