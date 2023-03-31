const debug = require("debug")("kk:task_handlers:slack_helpers");
const _ = require("lodash");
const { WebClient } = require("@slack/web-api");

const logger = require("../../config/logging");

const { SLACK_TOKEN } = process.env;

const slackWebClient = new WebClient(SLACK_TOKEN);

const sendMessageToSlack = async (purpose, text, channelId, threadTs) => {
    try {
        if (process.env.NODE_ENV === "test") {
            return {
                message: {
                    ts: 0,
                },
            };
        }

        const response = await slackWebClient.chat.postMessage({
            text: text,
            channel: channelId,
            thread_ts: threadTs,
        });
        logger.info(`${_.upperFirst(purpose)} Slack message sent`);
        return response;
    }
    catch (err) {
        debug(err);
        logger.error(err, `Error sending ${purpose} Slack message`);
        return null;
    }
};

const sendReactionToSlackMessage = async (purpose, reactionName, channelId, threadTs) => {
    try {
        const response = await slackWebClient.reactions.add({
            name: reactionName,
            channel: channelId,
            timestamp: threadTs,
        });
        logger.info(`${_.upperFirst(purpose)} Slack reaction sent`);
        return response;
    }
    catch (err) {
        debug(err);
        logger.error(err, `Error sending ${purpose} Slack reaction`);
        return null;
    }
};

module.exports = {
    sendMessageToSlack,
    sendReactionToSlackMessage,
};
