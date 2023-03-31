const createCloudTask = require("./cloud_tasks_helpers");
const logger = require("../../config/logging");

/*
* This class is used for storing state information of a cloud task sequence. If an item has a 'nextTaskItem' member,
* that member item is in-turn run, when the task is marked as done.
* This ensures that an organised collection of long running asynchronous tasks - such as data syndication -
* is always run in the correct sequence.
* */
class CloudTaskItem {
    constructor(cloudTaskName, queueId, url, method, nextTask) {
        this.cloudTaskName = cloudTaskName;
        this.cloudTaskQueueId = queueId;
        this.cloudTaskUrl = url;
        this.cloudTaskMethod = method;
        this.nextTaskItem = nextTask;
    }

    getCloudTaskName() {
        return this.cloudTaskName;
    }

    getCloudTaskUrl() {
        return this.cloudTaskUrl;
    }

    getCloudTaskQueueId() {
        return this.cloudTaskQueueId;
    }

    getCloudTaskMethod() {
        return this.cloudTaskMethod;
    }

    getNextItem() {
        return this.nextTaskItem || undefined;
    }

    async done(params, delay) {
        if (this.nextTaskItem) {
            await createCloudTask(
                this.nextTaskItem.getCloudTaskQueueId(),
                this.nextTaskItem.getCloudTaskMethod(),
                this.nextTaskItem.getCloudTaskUrl(),
                params,
                delay,
            );
        }
    }

    async process(params, delay) {
        var qID = this.getCloudTaskQueueId()
        logger.info(`Syndication Cloud Task Item: process: "${qID}" - "${this.getCloudTaskMethod()}" - "${this.getCloudTaskUrl()}" `);
        if(qID){
            await createCloudTask(
                qID,
                this.getCloudTaskMethod(),
                this.getCloudTaskUrl(),
                params,
                delay,
            );
        }
    }
}

module.exports = CloudTaskItem;
