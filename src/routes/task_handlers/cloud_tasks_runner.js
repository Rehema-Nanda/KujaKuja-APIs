const CloudTaskItem = require("./cloud_task_item");
const { sendMessageToSlack, sendReactionToSlackMessage } = require("./slack_helpers");
const logger = require("../../config/logging");
const {
    MessageHistoryEvent,
    MessageHistorySource,
    MessageHistoryDestination,
    createMessageHistoryEntry,
    updateMessageHistoryEntryWithSlackThreadTs,
} = require("./message_history_helpers");

const {
    GOOGLE_CLOUD_PROJECT,
    SLACK_CHANNEL_ID,
    TAGGING_QUEUE_ID,
    SYND_QUEUE_ID,
} = process.env;

const CloudTaskNames = {
    SYNDICATION_EXPORT: "export",
    SYNDICATION_CREATE_SCHEMAS: "create_schemas",
    SYNDICATION_IMPORT: "import",
    SYNDICATION_MIGRATE: "migrate",
    SYNDICATION_BQ_EXPORT: "bq_export",
    SYNDICATION_BQ_LOAD: "bq_load",
    BULK_TAG: "bulk_tag",
    SYNDICATION_BQ_LOAD_W_TAGS: "bq_load_with_tags",
    SYNDICATION_BQ_EXPORT_W_TAGS: "bq_export_with_tags",
};

class SyndicationCloudTaskRunner {
    constructor() {
        this.bigQueryLoadWithTagsTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_BQ_LOAD_W_TAGS, SYND_QUEUE_ID, "/tasks/syndication/load_into_big_query_with_tags", "POST");
        this.bigQueryExportWithTagsTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_BQ_EXPORT_W_TAGS, SYND_QUEUE_ID, "/tasks/syndication/export_for_big_query_with_tags", "POST", this.bigQueryLoadWithTagsTask);
        this.bulkTaggingTask = new CloudTaskItem(CloudTaskNames.BULK_TAG, TAGGING_QUEUE_ID, "/tasks/tag/daily_bulk_tag", "GET", this.bigQueryExportWithTagsTask);
        this.bigQueryLoadTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_BQ_LOAD, SYND_QUEUE_ID, "/tasks/syndication/load_into_big_query", "POST", this.bulkTaggingTask);
        this.bigQueryExportTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_BQ_EXPORT, SYND_QUEUE_ID, "/tasks/syndication/export_for_big_query", "POST", this.bigQueryLoadTask);
        this.migrateDataTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_MIGRATE, SYND_QUEUE_ID, "/tasks/syndication/schemas_and_migration/migrate_all_data", "POST", this.bigQueryExportTask);
        this.importTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_IMPORT, SYND_QUEUE_ID, "/tasks/syndication/import", "POST", this.migrateDataTask);
        this.createSchemaTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_CREATE_SCHEMAS, SYND_QUEUE_ID, "/tasks/syndication/schemas_and_migration/create_all_schemas", "POST", this.importTask);
        this.exportTask = new CloudTaskItem(CloudTaskNames.SYNDICATION_EXPORT, SYND_QUEUE_ID, "/tasks/syndication/export", "POST", this.createSchemaTask);
        this.currentTask = new CloudTaskItem("", null, "", "", this.exportTask);
    }

    async initiate() {
        logger.info(`Syndication cloud_tasks_runner: initiate: Data Run *(${GOOGLE_CLOUD_PROJECT})*`);
        const slackThreadSummary = `Data Run *(${GOOGLE_CLOUD_PROJECT})* - Details in thread below...`;
        const messageHistoryResult = await createMessageHistoryEntry(
            MessageHistoryEvent.DATA_RUN_PROGRESS,
            MessageHistorySource.SYSTEM,
            null,
            MessageHistoryDestination.SLACK,
            {
                channel_id: SLACK_CHANNEL_ID,
            },
            slackThreadSummary,
        );
        const messageHistoryId = messageHistoryResult[0];
        const slackMessageResponse = await sendMessageToSlack(
            "data run started", slackThreadSummary, SLACK_CHANNEL_ID,
        );
        this.slackThreadTs = slackMessageResponse.message.ts;
        await updateMessageHistoryEntryWithSlackThreadTs(messageHistoryId, this.slackThreadTs);
        this.currentTask = new CloudTaskItem("", null, "", "", this.exportTask);
    }

    async sendSlackMessage(slackMessage, purpose) {
        if (!this.slackThreadTs) {
            return;
        }
        await createMessageHistoryEntry(
            MessageHistoryEvent.DATA_RUN_PROGRESS,
            MessageHistorySource.SYSTEM,
            null,
            MessageHistoryDestination.SLACK,
            {
                channel_id: SLACK_CHANNEL_ID,
                thread_ts: this.slackThreadTs,
            },
            slackMessage,
        );
        await sendMessageToSlack(
            purpose, slackMessage, SLACK_CHANNEL_ID, this.slackThreadTs,
        );
    }

    getSlackTreadTs() {
        return this.slackThreadTs;
    }

    async sendSlackReaction(slackReaction, purpose) {
        if (!this.slackThreadTs) {
            return;
        }

        await createMessageHistoryEntry(
            MessageHistoryEvent.DATA_RUN_PROGRESS,
            MessageHistorySource.SYSTEM,
            null,
            MessageHistoryDestination.SLACK,
            {
                channel_id: SLACK_CHANNEL_ID,
                thread_ts: this.slackThreadTs,
            },
            slackReaction,
        );
        await sendReactionToSlackMessage(
            purpose, slackReaction, SLACK_CHANNEL_ID, this.slackThreadTs,
        );
    }

    async reQueueTask(params, delay) {
        if (this.currentTask) {
            await this.currentTask.process(params, delay);
        }
    }

    async taskDone(params, delay) {
        if (this.currentTask) {
            await this.currentTask.done(params, delay);
            this.currentTask = this.currentTask.getNextItem();
        }
    }

    async skipToTask(taskName, params, delay) {
        switch (taskName) {
            case CloudTaskNames.SYNDICATION_EXPORT:
                this.currentTask = this.exportTask;
                break;
            case CloudTaskNames.SYNDICATION_CREATE_SCHEMAS:
                this.currentTask = this.createSchemaTask;
                break;
            case CloudTaskNames.SYNDICATION_IMPORT:
                this.currentTask = this.importTask;
                break;
            case CloudTaskNames.SYNDICATION_MIGRATE:
                this.currentTask = this.migrateDataTask;
                break;
            case CloudTaskNames.SYNDICATION_BQ_EXPORT:
                this.currentTask = this.bigQueryExportTask;
                break;
            case taskName.SYNDICATION_BQ_LOAD:
                this.currentTask = this.bigQueryLoadTask;
                break;
            case CloudTaskNames.BULK_TAG:
                this.currentTask = this.bulkTaggingTask;
                break;
            case CloudTaskNames.SYNDICATION_BQ_EXPORT_W_TAGS:
                this.currentTask = this.bigQueryExportWithTagsTask;
                break;
            case CloudTaskNames.SYNDICATION_BQ_LOAD_W_TAGS:
                this.currentTask = this.bigQueryLoadWithTagsTask;
                break;
            default:
                this.currentTask = undefined;
                break;
        }
        if (this.currentTask) {
            await this.currentTask.process(params, delay);
        }
    }
}

const syndicationCloudTaskRunner = new SyndicationCloudTaskRunner();

module.exports = {
    syndicationCloudTaskRunner,
    CloudTaskNames,
};
