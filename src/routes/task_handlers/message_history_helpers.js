/* eslint-disable max-classes-per-file */

const debug = require("debug")("kk:task_handlers:message_history_helpers");
const logger = require("../../config/logging");
const knex = require("../../knex");

class MessageHistoryEvent {
    static get DATAFIX_AUDIT() {
        return "DATAFIX_AUDIT";
    }

    static get DATA_RUN_PROGRESS() {
        return "DATA_RUN_PROGRESS";
    }
}

class MessageHistorySource {
    static get SYSTEM() {
        return "SYSTEM";
    }
}

class MessageHistoryDestination {
    static get EMAIL() {
        return "EMAIL";
    }

    static get SLACK() {
        return "SLACK";
    }
}

const createMessageHistoryEntry = async (
    eventName, msgSource, msgSourceDetail, msgDestination, msgDestinationDetail, msgBody,
) => {
    const record = {
        event: eventName,
        source: msgSource,
        source_detail: msgSourceDetail,
        destination: msgDestination,
        destination_detail: msgDestinationDetail,
        body: msgBody,
    };

    try {
        return knex("message_history").returning("id").insert(record);
    }
    catch (err) {
        // if we can't insert the record, at least log it
        debug(record);
        logger.info(record);
        throw err;
    }
};

const updateMessageHistoryEntryWithSlackThreadTs = async (messageHistoryId, threadTs) => {
    return knex.raw(
        `
        UPDATE message_history
        SET destination_detail = jsonb_set(destination_detail, '{thread_ts}', :threadTs)
        WHERE id = :id
        `,
        {
            threadTs: `"${threadTs}"`,
            id: messageHistoryId,
        },
    );
};

module.exports = {
    MessageHistoryEvent,
    MessageHistorySource,
    MessageHistoryDestination,
    createMessageHistoryEntry,
    updateMessageHistoryEntryWithSlackThreadTs,
};
