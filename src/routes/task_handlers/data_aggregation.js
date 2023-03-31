const express = require("express");
const { PubSub } = require("@google-cloud/pubsub");

const debug = require("debug")("kk:task_handlers:data_aggregation");
const logger = require("../../config/logging");

const knex = require("../../knex");

const router = express.Router();

const pubSub = new PubSub();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const topic = process.env.DATA_AGGREGATION_PUB_SUB_TOPIC;

const publishToTopic = async (payload, topicName) => {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    return pubSub.topic(topicName).publish(dataBuffer);
};

router.post("/response_count", async (req, res) => {
    try {
        const result = await knex("responses").count();
        const responseCount = parseInt(result[0].count, 10);
        await publishToTopic(
            {
                client: projectId,
                total_responses: responseCount,
            },
            topic,
        );
        res.status(200).end();
    }
    catch (error) {
        debug(error);
        req.log.error(error);
        res.status(500).end();
    }
});

module.exports = router;
