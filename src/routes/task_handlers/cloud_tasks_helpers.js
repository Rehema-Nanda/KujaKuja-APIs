const debug = require("debug")("kk:task_handlers:cloud_task_helpers");
const cloudTasks = require("@google-cloud/tasks");

const logger = require("../../config/logging");

const { GOOGLE_CLOUD_PROJECT, GCP_LOCATION } = process.env;

const cloudTasksClient = new cloudTasks.CloudTasksClient();

const createCloudTask = async (queueId, method, uri, params, delay = 30) => {
    if (process.env.NODE_ENV === "test") {
        return;
    }

    logger.info(`Syndication Cloud Task Helpers: GOOGLE_CLOUD_PROJECT: "${GOOGLE_CLOUD_PROJECT}"`);
    logger.info(`Syndication Cloud Task Helpers: GCP_LOCATION: "${GCP_LOCATION}"`);
    logger.info(`Syndication Cloud Task Helpers: queueId: "${queueId}"`);
    logger.info(`Syndication Cloud Task Helpers: cloudTasksClient`);

    const createTaskParent = cloudTasksClient.queuePath(GOOGLE_CLOUD_PROJECT, GCP_LOCATION, queueId);

    let body = null;
    if (method === "POST" && !params) {
        throw new Error("POST method should have parameters");
    }
    if (params) {
        body = Buffer.from(JSON.stringify(params)).toString("base64");
    }

    try {
        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: method,
                relativeUri: uri,
                appEngineRouting: {
                    service: "api",
                },
                body: body,
            },
            scheduleTime: {
                seconds: delay + Date.now() / 1000,
            },
        };
        if (method === "GET") {
            delete cloudTask.appEngineHttpRequest.body; // body can only be set if the http_method is POST
        }

        // https://googleapis.dev/nodejs/tasks/latest/v2.CloudTasksClient.html#createTask
        const cloudTaskRequest = {
            parent: createTaskParent,
            task: cloudTask,
        };
        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);

        const taskName = createTaskResponse[0].name;
        logger.info(`Created Cloud Task: ${taskName}`);
    }
    catch (err) {
        debug(err);
        logger.error(err, "Cloud Task creation error");
        throw err;
    }
};

module.exports = createCloudTask;
