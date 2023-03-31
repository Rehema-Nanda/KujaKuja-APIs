const debug = require("debug")("kk:task_handlers:slack");
const express = require("express");
const moment = require("moment");

const { sendMessageToSlack } = require("./slack_helpers");
const {
    MessageHistoryEvent,
    MessageHistorySource,
    MessageHistoryDestination,
    createMessageHistoryEntry,
    updateMessageHistoryEntryWithSlackThreadTs,
} = require("./message_history_helpers");

const router = express.Router();

const {
    GOOGLE_CLOUD_PROJECT,
    SLACK_CHANNEL_ID,
} = process.env;

router.post("/datafix_audit", async (req, res) => {
    try {
        const {
            newValue, oldValue, updateType, locationName, ids, email, reverseQuery,
        } = JSON.parse(Buffer.from(req.body, "base64").toString());

        let updatedToValue = newValue;
        let oldValueToBeUpdated = oldValue;

        if (updateType === "Created At") {
            updatedToValue = moment(newValue).format("ddd MMM DD YYYY");
            oldValueToBeUpdated = moment(oldValue).format("ddd MMM DD YYYY");
        }

        const date = moment.utc().format("MMM DD YYYY");
        const time = moment.utc().format("HH:mm");

        /* eslint-disable max-len */
        const messageSummary = `Data Fix Applied *(${GOOGLE_CLOUD_PROJECT} / ${locationName})* - *${ids.length}* response(s) affected. Details in thread below...`;

        const messageDetail = `Hello!

User *${email}* made a data fix on ${date} at ${time}.

*Environment name:* ${GOOGLE_CLOUD_PROJECT}
*Location name:* ${locationName}
*Type of change:* Update ${updateType}
*No. of responses affected:* ${ids.length}
*New ${updateType}:* ${updatedToValue}
*Old ${updateType}:* ${oldValueToBeUpdated}

If you believe this was done in error, or if you have any questions/concerns regarding this change, please get in touch with the tech team.

Technical Info
Affected response IDs: ${ids}
Reverse Query:

sql: ${reverseQuery.sql}
bindings: ${reverseQuery.bindings}`;
        /* eslint-enable max-len */

        const messageHistoryResult = await createMessageHistoryEntry(
            MessageHistoryEvent.DATAFIX_AUDIT,
            MessageHistorySource.SYSTEM,
            null,
            MessageHistoryDestination.SLACK,
            {
                channel_id: SLACK_CHANNEL_ID,
            },
            `${messageSummary}\n\n${messageDetail}`,
        );
        const messageHistoryId = messageHistoryResult[0];

        const messagePurpose = "data-fix audit";
        const response = await sendMessageToSlack(messagePurpose, messageSummary, SLACK_CHANNEL_ID);

        if (response) {
            await updateMessageHistoryEntryWithSlackThreadTs(messageHistoryId, response.message.ts);
            await sendMessageToSlack(messagePurpose, messageDetail, SLACK_CHANNEL_ID, response.message.ts);
        }

        res.status(200).end();
    }
    catch (error) {
        debug(error);
        req.log.error(error);
        res.status(500).end();
    }
});

module.exports = router;
