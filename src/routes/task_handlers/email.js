const debug = require("debug")("kk:task_handlers:email");
const express = require("express");
const moment = require("moment");
const sgMail = require("@sendgrid/mail");

const logger = require("../../config/logging");
const {
    MessageHistoryEvent,
    MessageHistorySource,
    MessageHistoryDestination,
    createMessageHistoryEntry,
} = require("./message_history_helpers");

const router = express.Router();

const {
    GOOGLE_CLOUD_PROJECT,
    SENDGRID_API_KEY,
    DATAFIX_AUDIT_TO_ADDRESS,
    DATAFIX_AUDIT_FROM_ADDRESS,
    DATAFIX_AUDIT_SUBJECT,
} = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

router.post("/datafix_audit", async (req, res) => {
    try {
        const {
            newValue, oldValue, updateType, ids, email, reverseQuery,
        } = JSON.parse(Buffer.from(req.body, "base64").toString());

        let newUpdatedValue = newValue;
        let oldValueToBeUpdated = oldValue;

        if (updateType === "Created At") {
            newUpdatedValue = moment(newValue).format("ddd MMM DD YYYY");
            oldValueToBeUpdated = moment(oldValue).format("ddd MMM DD YYYY");
        }

        const date = moment.utc().format("MMM DD YYYY");
        const time = moment.utc().format("HH:mm");

        /* eslint-disable max-len */
        const msg = {
            to: DATAFIX_AUDIT_TO_ADDRESS.split(";"),
            from: DATAFIX_AUDIT_FROM_ADDRESS,
            subject: `${DATAFIX_AUDIT_SUBJECT} (${GOOGLE_CLOUD_PROJECT})`,
            text: `Hello!

User ${email} made a data fix on ${date} at ${time}.

Environment name: ${GOOGLE_CLOUD_PROJECT}
Type of change: Update ${updateType}
No. of responses affected: ${ids.length}
New ${updateType}: ${newUpdatedValue}
Old ${updateType}: ${oldValueToBeUpdated}

If you believe this was done in error, or if you have any questions/concerns regarding this change, please get in touch with the tech team.

Technical Info
Affected response IDs: ${ids.join(", ")}
Reverse Query:

sql: ${reverseQuery.sql}
bindings: ${reverseQuery.bindings}`,
        };
        /* eslint-enable max-len */

        await createMessageHistoryEntry(
            MessageHistoryEvent.DATAFIX_AUDIT,
            MessageHistorySource.SYSTEM,
            null,
            MessageHistoryDestination.EMAIL,
            {
                to: msg.to,
                from: msg.from,
                subject: msg.subject,
            },
            msg.text,
        );

        sgMail.send(msg).then(() => {
            req.log.info("Data-fix audit email sent");
        }).catch((error) => {
            debug(error);
            req.log.error(error, "Error sending data-fix audit email");
        }).then(() => {
            res.status(200).end();
        });
    }
    catch (error) {
        debug(error);
        req.log.error(error);
        res.status(500).end();
    }
});

module.exports = router;
