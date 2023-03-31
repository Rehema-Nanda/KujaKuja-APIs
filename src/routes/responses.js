const debug = require("debug")("kk:responses");

const express = require("express");

const router = express.Router();

const { transaction } = require("objection");
const _ = require("lodash");
const moment = require("moment");

const cloudTasks = require("@google-cloud/tasks");

const cloudTasksClient = new cloudTasks.CloudTasksClient();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GCP_LOCATION;

const emailQueueId = process.env.EMAIL_QUEUE_ID;
const nlpQueueId = process.env.NLP_QUEUE_ID;
const pubSubQueueId = process.env.PUB_SUB_QUEUE_ID;
const slackQueueId = process.env.SLACK_QUEUE_ID;

const createTaskEmailParent = cloudTasksClient.queuePath(projectId, location, emailQueueId);
const createTaskNlpParent = cloudTasksClient.queuePath(projectId, location, nlpQueueId);
const createTaskPubSubParent = cloudTasksClient.queuePath(projectId, location, pubSubQueueId);
const createTaskSlackParent = cloudTasksClient.queuePath(projectId, location, slackQueueId);

const Response = require("../models/response");

const knex = Response.knex();

const {
    FRONTEND_LOGIN_REQUIRED,
} = process.env;

const {
    InvalidParamsError,
    ResourceNotFoundError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// POST / => create one or many responses
router.post("/", async (req, res, next) => {
    if (_.isEmpty(req.body)) {
        debug("Create responses error : Missing data(422)");
        res.status(422).json({ error: "Missing data" });
        return;
    }

    if (!Array.isArray(req.body)) {
        debug("Create responses error : Invalid data(422)");
        res.status(422).json({ error: "Invalid data" });
        return;
    }

    if (!(req.user.is_admin || req.user.is_survey)) {
        debug("Create responses error : Insufficient permissions(401)");
        res.status(401).json({ error: "Insufficient permissions" });
        return;
    }

    const responses = req.body;
    const { user } = req;

    try {
        const [insertedResponseIdsWithIdeas] = await insertResponses(responses, user);

        await createNlpFanoutTask(insertedResponseIdsWithIdeas, req);
        await createResponseCountAggregationTask(req);
        await createIdeaLangDetectTask(insertedResponseIdsWithIdeas, req);

        res.status(200).end();
    }
    catch (err) {
        if (err instanceof Response.ValidationError) {
            debug("Create responses error : Invalid data(422)");
            res.status(422).json({ error: err.data });
        }
        else {
            debug(err);
            req.log.error(err);
            res.status(500).end();
        }
    }
});

let createNlpFanoutTask = async function (responseIds, expressRequest) {
    if (responseIds.length === 0) {
        return;
    }

    try {
        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: "/tasks/nlp/fanout",
                appEngineRouting: {
                    service: "api",
                },
                body: Buffer.from(JSON.stringify(responseIds)).toString("base64"),
            },
        };

        const cloudTaskRequest = {
            parent: createTaskNlpParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createNlpFanoutTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        expressRequest.log.error(err);
        // we don't rethrow because this is not a significant enough failure to warrant a failure response - we can
        // always queue the NLP work later
    }
};

let createIdeaLangDetectTask = async (responses, expressRequest) => {
    if (!responses.length) {
        return;
    }

    try {
        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: "/tasks/nlp/idea_lng_detect",
                appEngineRouting: {
                    service: "api",
                },
                body: Buffer.from(JSON.stringify(responses)).toString("base64"),
            },
        };

        const cloudTaskRequest = {
            parent: createTaskNlpParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createIdeaLangDetectTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        req.log.error(err);
    }
};

let createResponseCountAggregationTask = async function (expressRequest) {
    try {
        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: "/tasks/data_aggregation/response_count",
                appEngineRouting: {
                    service: "api",
                },
            },
        };

        const cloudTaskRequest = {
            parent: createTaskPubSubParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createResponseCountAggregationTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        expressRequest.log.error(err);
        // we don't rethrow because this is not a significant enough failure to warrant a failure response
    }
};

const createAuditEmailTask = async function (newValue, oldValue, updateType, ids, email, reverseQuery, expressRequest) {
    try {
        const requestBody = {
            newValue,
            oldValue,
            updateType,
            ids,
            email,
            reverseQuery,
        };

        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: "/tasks/email/datafix_audit",
                appEngineRouting: {
                    service: "api",
                },
                body: Buffer.from(JSON.stringify(requestBody)).toString("base64"),
            },
        };

        const cloudTaskRequest = {
            parent: createTaskEmailParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createAuditEmailTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        expressRequest.log.error(err);
        // we don't rethrow because this is not a significant enough failure to warrant a failure response
    }
};

const createSendToSlackTask = async function (
    newValue, oldValue, updateType, locationName, ids, email, reverseQuery, expressRequest
) {
    try {
        const requestBody = {
            newValue,
            oldValue,
            updateType,
            locationName,
            ids,
            email,
            reverseQuery,
        };

        const cloudTask = {
            appEngineHttpRequest: {
                httpMethod: "POST",
                relativeUri: "/tasks/slack/datafix_audit",
                appEngineRouting: {
                    service: "api",
                },
                body: Buffer.from(JSON.stringify(requestBody)).toString("base64"),
            },
        };

        const cloudTaskRequest = {
            parent: createTaskSlackParent,
            task: cloudTask,
        };

        const createTaskResponse = await cloudTasksClient.createTask(cloudTaskRequest);
        const taskName = createTaskResponse[0].name;
        expressRequest.log.info(`Created task from createSendToSlackTask: ${taskName}`);
    }
    catch (err) {
        debug(err);
        expressRequest.log.error(err);
        // we don't rethrow because this is not a significant enough failure to warrant a failure response
    }
};

let insertResponses = async function (responses, user) {
    // NB: response.created_at & response.unique_id should be set by the client

    return transaction(knex, async (trx) => {
        const dedupedResponses = await filterOutExistingResponses(responses, trx);
        const preparedResponses = await prepareResponsesForInsertion(dedupedResponses, user, trx);

        const promise = Response.query(trx).insert(preparedResponses).then((insertedResponses) => {
            const responseIdsWithIdeas = [];
            const responseIdsWithoutIdeas = [];
            insertedResponses.forEach((insertedResponse) => {
                if (insertedResponse.idea) {
                    responseIdsWithIdeas.push(parseInt(insertedResponse.id, 10));
                }
                else {
                    responseIdsWithoutIdeas.push(parseInt(insertedResponse.id, 10));
                }
            });
            return [responseIdsWithIdeas, responseIdsWithoutIdeas];
        });

        // the transaction is committed if this promise resolves
        // if this promise is rejected or an error is thrown inside of this callback function, the transaction is rolled
        // back
        return promise;
    });
};

let filterOutExistingResponses = async function (responses, trx) {
    const responseUniqueIds = _.map(responses, (response) => {
        return response.unique_id;
    });
    let existingUniqueIds = await Response.query(trx).select("unique_id").where("unique_id", "in", responseUniqueIds);
    existingUniqueIds = new Set(_.map(existingUniqueIds, (responseObj) => {
        return responseObj.unique_id;
    }));
    // TODO: log a warning for existingUniqueIds

    return responses.filter((response) => {
        return !existingUniqueIds.has(response.unique_id);
    });
};

let prepareResponsesForInsertion = async function (responses, user, trx) {
    const now = moment().format();

    // fetch service points - this is done so that we can set response coordinates to service point coordinates if the response has none
    const servicePoints = await fetchServicePoints(responses, trx);

    return _.map(responses, (response) => {
        response.uploaded_at = now;
        delete response.updated_at; // don't allow clients to set this
        response.user_id = parseInt(user.id, 10);

        // set response coordinates to service point coordinates if the response has none
        // TODO: consider using _.isNil and/or _.inRange or _.clamp - for example, a 0 latitude causes this to behave in an unexpected manner
        if (!(response.lat && response.lng) && servicePoints.hasOwnProperty(response.service_point_id)) {
            response.lat = servicePoints[response.service_point_id].lat;
            response.lng = servicePoints[response.service_point_id].lng;
        }

        return response;
    });
};

let fetchServicePoints = async function (responses, trx) {
    const servicePointIds = new Set(_.map(responses, (response) => {
        return response.service_point_id;
    }));

    const results = await knex("service_points")
        .transacting(trx)
        .select("service_points.id", "service_points.lat", "service_points.lng")
        .where("service_points.id", "in", [...servicePointIds]);

    const servicePoints = {};
    _.forEach(results, (row) => {
        const id = parseInt(row.id, 10);

        servicePoints[id] = {
            id: id,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
        };
    });

    return servicePoints;
};

const convertKeywordsToTextSearchVectorQuery = (keywords) => {
    // converts keywords into format expected for full-text search vector query on response ideas
    // "tap monitor" water    :    converted to '(tap <-> monitor) & water'
    // tap monitor water      :    converted to 'tap & monitor & water'

    const keywordsSplitByQuotes = keywords.trim().match(/\w+|"[^"]+"/g);
    if (keywordsSplitByQuotes && keywordsSplitByQuotes.length) {
        const querySearchWords = [];
        keywordsSplitByQuotes.forEach((keyword) => {
            if (keyword) {
                querySearchWords.push(keyword
                    .replace(/\s+/g, " <-> ")
                    .replace('"', "(")
                    .replace('"', ")"));
            }
        });
        return querySearchWords.join(" & ");
    }
    return null;
};

const retrieveVectorisationLanguage = () => {
    const ideasLanguage = (process.env.IDEAS_LANGUAGE || "en").trim().toLowerCase();
    let tsVectorLanguage = "pg_catalog.english";
    switch (ideasLanguage) {
        case "es":
            tsVectorLanguage = "pg_catalog.spanish";
            break;
        case "fr":
            tsVectorLanguage = "pg_catalog.french";
            break;
        default:
            break;
    }
    return tsVectorLanguage;
};

const applySearchConditions = (dataQuery, keywordSearch) => {
    const searchExpression = keywordSearch.trim();
    const tagsRegex = /#[\w-]+/ig;
    const tsVectorLanguage = retrieveVectorisationLanguage();

    // search for tags, if the search expression contains one or more '#' characters
    if (searchExpression.includes("#")) {
        const tagMatches = searchExpression.match(tagsRegex);

        if (tagMatches !== null && tagMatches.length > 0) {
            // note that we are converting both the tags in the search expression and the tags in the tags table to
            // lower-case, to ensure case-insensitive matching
            const tagsWithoutNull = tagMatches.filter((tag) => !tag.includes("#null"));
            const tags = tagsWithoutNull.map((tag) => {
                return tag.replace(/#/g, "").toLowerCase();
            });

            // see note about array bindings here: https://knexjs.org/#Raw-Bindings
            if (tagsWithoutNull.length > 0) {
                dataQuery.whereRaw(
                    `LOWER(tags.name) IN (${tags.map(() => {
                        return "?";
                    }).join(",")})`,
                    [...tags],
                );
            }

            // checks if there are more than 1 tag and if one of them is a #null tag or if #null tag is the only filter
            if (
                (tagMatches.length > 1 && tagMatches.filter((tag) => tag.includes('#null')).length > 0)
                || (tagMatches.length = 1 && tagMatches[0].includes("#null")))
            {
                dataQuery.whereRaw("all_tags.name IS NULL");
            }
        }
    }
    // perform a text search on the search expression, if it marked as a ts-query
    if (searchExpression.startsWith("textsearch:")) {
        const tsVectorQuery = searchExpression.split(":")[1].trim();
        dataQuery.andWhereRaw(
            `responses.idea_token_vector @@ to_tsquery(:tsVectorLanguage, :tsVectorQuery)`,
            {
                tsVectorLanguage,
                tsVectorQuery,
            },
        );
        return {
            tsVectorLanguage,
            tsVectorQuery,
        };
    }

    // Perform a ts-query on the search words, excluding tag searches
    const tsVectorQuery = convertKeywordsToTextSearchVectorQuery(searchExpression.replace(tagsRegex, ""));
    if (tsVectorQuery) {
        dataQuery.andWhereRaw(
            `responses.idea_token_vector @@ to_tsquery(:tsVectorLanguage, :tsVectorQuery)`,
            {
                tsVectorLanguage,
                tsVectorQuery,
            },
        );
        return {
            tsVectorLanguage,
            tsVectorQuery,
        };
    }

    return {};
};

// POST /responses/ideas
// Description: Get response ideas, optionally filtered by the given parameters.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// points (array[integer]) : optional => list of service point IDs
// types (array[integer]) : optional => list of service type IDs
// keyword (string) : optional => keyword to search for in the responses' idea field
// limit (integer) : optional => define number of element to retrieve
// page (integer) : optional => define which page to to retrieve on a number of element
router.post("/ideas", (req, res) => {
    debug("Get response ideas");

    let startDate;
    let endDate;

    // if login required on front-end, ensure user has role attached
    if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
        debug("Get response ideas error : Insufficient permissions(401)");
        res.status(401).json({ error: "Insufficient permissions" });
        return;
    }

    if (req.body.start) {
        startDate = moment.utc(req.body.start, "YYYY-MM-DD", true);
    }
    else {
        startDate = moment.utc().subtract(7, "days").startOf("day");
    }

    if (req.body.end) {
        endDate = moment.utc(req.body.end, "YYYY-MM-DD", true);
    }
    else {
        endDate = moment.utc().startOf("day");
    }

    if (!startDate.isValid() || !endDate.isValid()) {
        debug("Get response ideas error : Bad request(400)");
        res.status(400).json({ error: "Bad request" });
        return;
    }

    if (startDate > endDate) {
        const tmp = endDate;
        endDate = startDate;
        startDate = tmp;
    }

    const servicePointIdsQuery = knex.select("service_points.id")
        .from("service_points")
        .leftJoin("service_types", "service_types.id", "service_points.service_type_id")
        .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
        .leftJoin("countries", "countries.id", "settlements.country_id")
        .where("countries.enabled", true);

    if (!_.isEmpty(req.body.countries)) {
        servicePointIdsQuery.where("countries.id", "in", req.body.countries);
    }

    if (!_.isEmpty(req.body.settlements)) {
        servicePointIdsQuery.where("settlements.id", "in", req.body.settlements);
    }

    if (!_.isEmpty(req.body.points)) {
        servicePointIdsQuery.where("service_points.id", "in", req.body.points);
    }

    if (!_.isEmpty(req.body.types)) {
        servicePointIdsQuery.where("service_types.id", "in", req.body.types);
    }

    const resp = {
        dates: {
            start: startDate.format(),
            end: endDate.format(),
        },
        count: 0,
        data: [],
    };

    const dataQuery = knex("responses")
        .leftJoin("service_points", "service_points.id", "responses.service_point_id")
        .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
        .leftJoin("tags", "tags.response_id", "responses.id")
        .leftJoin("tags as all_tags", "all_tags.response_id", "responses.id")
        .where("responses.service_point_id", "in", servicePointIdsQuery)
        .andWhereRaw("responses.idea != 'none' AND COALESCE(TRIM(responses.idea), '') != ''")
        .andWhere("responses.created_at", ">=", startDate.format())
        .andWhere("responses.created_at", "<", endDate.format());

    let tsVectorQuery;
    let tsVectorLanguage;
    if (req.body.keyword) {
        ({ tsVectorLanguage, tsVectorQuery } = applySearchConditions(dataQuery, req.body.keyword));
    }

    // if a full-text search is being performed, use the 'ts_headline' PostgreSQL function to highlight the keywords in
    // the idea, otherwise select the idea normally
    if (tsVectorLanguage && tsVectorQuery) {
        dataQuery.select(
            knex.raw(
                "ts_headline(:queryLanguage, idea, to_tsquery(:queryLanguage, :vectorQuery), 'StartSel = <em>, StopSel = </em>, HighlightAll=TRUE') AS idea",
                {
                    queryLanguage: tsVectorLanguage,
                    vectorQuery: tsVectorQuery,
                },
            ),
        );
    }
    else {
        dataQuery.select("responses.idea");
    }

    dataQuery.select(
        "responses.id",
        "responses.created_at",
        "responses.is_starred",
        "responses.idea_language",
        "settlements.name",
        knex.raw("ARRAY_TO_STRING(ARRAY_AGG(DISTINCT all_tags.name), ',') AS tags"),
    ).groupBy(
        "responses.id",
        "settlements.name",
    ).orderBy("responses.created_at", "desc");

    const totalCountQuery = knex(dataQuery.clone().as("data")).count();
    const satisfiedCountQuery = knex(dataQuery.clone().where("responses.satisfied", true).as("count")).count();

    if (req.body.limit) {
        dataQuery.limit(parseInt(req.body.limit, 10));
    }

    if (req.body.page) {
        dataQuery.offset((parseInt(req.body.page, 10) - 1) * parseInt(req.body.limit, 10));
    }

    Promise.all([totalCountQuery, satisfiedCountQuery, dataQuery]).then((results) => {
        const [totalCountResult, satisfiedCountResult, dataQueryResult] = results;
        resp.count = parseInt(totalCountResult[0].count, 10);
        resp.satisfied = parseInt(satisfiedCountResult[0].count, 10);
        resp.data = dataQueryResult;
        res.status(200).json(resp);
    }).catch((err) => {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    });
});

// TODO: renames, start > start_date, end > end_date, points > service_points, types > service_types
//       & make consistent across all endpoints
// POST /responses/admin/my_data
// Description: Get responses for the admin panel, optionally filtered by the given parameters.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample(created_at)
// end (date : YYYY-MM-DD) : optional => end date of the sample(created_at)
// uploaded_at_start_date (date : YYYY-MM-DD) : optional => start date of the sample(uploaded_at)
// uploaded_at_end_date (date : YYYY-MM-DD) : optional => end date of the sample(uploaded_at)
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// points (array[integer]) : optional => list of service point IDs
// types (array[integer]) : optional => list of service type IDs
// keyword (string) : optional => keyword to search for in the responses' idea field
// users (array[integer]) : optional => list of user IDs
// response_types (array[string]) : optional => list of response types
// satisfied (array[boolean]) : optional => true or false or both
// is_starred (array[boolean]) : optional => true or false or both
// limit (integer) : optional => pagination, number of records to return
// page (integer) : optional => pagination, the page number to return
// sort (object : {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
router.post("/admin/my_data", (req, res) => {
    debug("Get responses for admin");

    if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
        debug("Get responses for admin error : Insufficient permissions(401)");
        res.status(401).json({ error: "Insufficient permissions" });
        return;
    }

    let createdAtStartDate;
    let createdAtEndDate;
    let uploadedAtStartDate;
    let uploadedAtEndDate;

    if (req.body.start) {
        createdAtStartDate = moment.utc(req.body.start, "YYYY-MM-DD", true);
    }
    if (req.body.uploaded_at_start_date) {
        uploadedAtStartDate = moment.utc(req.body.uploaded_at_start_date, "YYYY-MM-DD", true);
    }
    if (!req.body.start && !req.body.uploaded_at_start_date) {
        createdAtStartDate = moment.utc().subtract(7, "days").startOf("day");
    }

    if (req.body.end) {
        createdAtEndDate = moment.utc(req.body.end, "YYYY-MM-DD", true);
    }
    if (req.body.uploaded_at_end_date) {
        uploadedAtEndDate = moment.utc(req.body.uploaded_at_end_date, "YYYY-MM-DD", true);
    }
    if (!req.body.end && !req.body.uploaded_at_end_date) {
        if (req.body.uploaded_at_start_date) {
            uploadedAtEndDate = moment.utc().startOf("day");
        }
        else {
            createdAtEndDate = moment.utc().startOf("day");
        }
    }

    if (createdAtStartDate && createdAtEndDate) {
        if (!createdAtStartDate.isValid() || !createdAtEndDate.isValid()) {
            debug("Get responses for admin error : Bad request(400)");
            res.status(400).json({ error: "Bad request" });
            return;
        }

        if (createdAtStartDate > createdAtEndDate) {
            const tmp = createdAtEndDate;
            createdAtEndDate = createdAtStartDate;
            createdAtStartDate = tmp;
        }
    }
    else {
        if (!uploadedAtStartDate.isValid() || !uploadedAtEndDate.isValid()) {
            debug("Get responses for admin error : Bad request(400)");
            res.status(400).json({ error: "Bad request" });
            return;
        }

        if (uploadedAtStartDate > uploadedAtEndDate) {
            const tmp = uploadedAtEndDate;
            uploadedAtEndDate = uploadedAtStartDate;
            uploadedAtStartDate = tmp;
        }
    }

    const servicePointIdsQuery = knex.select("service_points.id")
        .from("service_points")
        .leftJoin("service_types", "service_types.id", "service_points.service_type_id")
        .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
        .leftJoin("countries", "countries.id", "settlements.country_id");

    if (!_.isEmpty(req.body.countries)) {
        servicePointIdsQuery.where("countries.id", "in", req.body.countries);
    }

    if (!_.isEmpty(req.body.settlements)) {
        servicePointIdsQuery.where("settlements.id", "in", req.body.settlements);
    }

    if (!_.isEmpty(req.body.points)) {
        servicePointIdsQuery.where("service_points.id", "in", req.body.points);
    }

    if (!_.isEmpty(req.body.types)) {
        servicePointIdsQuery.where("service_types.id", "in", req.body.types);
    }

    const resp = {
        dates: {},
        count: 0,
        data: {},
        nonSyndicatedResponsesCount: 0,
    };

    const dataQuery = knex("responses")
        .leftJoin("service_points", "service_points.id", "responses.service_point_id")
        .leftJoin("service_types", "service_types.id", "service_points.service_type_id")
        .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
        .leftJoin("countries", "countries.id", "settlements.country_id")
        .leftJoin("users", "users.id", "responses.user_id")
        .leftJoin("settlements AS userLocation", "userLocation.id", "users.settlement_id")
        .leftJoin("tags", "tags.response_id", "responses.id")
        .leftJoin("tags as all_tags", "all_tags.response_id", "responses.id")
        .where("responses.service_point_id", "in", servicePointIdsQuery);

    if (createdAtStartDate && createdAtEndDate) {
        resp.dates = {
            start: createdAtStartDate.format(),
            end: createdAtEndDate.format(),
        };
        dataQuery.andWhere("responses.created_at", ">=", createdAtStartDate.format());
        dataQuery.andWhere("responses.created_at", "<", createdAtEndDate.format());
    }
    if (uploadedAtStartDate && uploadedAtEndDate) {
        resp.dates = {
            uploaded_at_start_date: uploadedAtStartDate.format(),
            uploaded_at_end_date: uploadedAtEndDate.format(),
        };
        dataQuery.andWhere("responses.uploaded_at", ">=", uploadedAtStartDate.format());
        dataQuery.andWhere("responses.uploaded_at", "<", uploadedAtEndDate.format());
    }

    if (!_.isEmpty(req.body.user_locations)) {
        dataQuery.andWhere("users.settlement_id", "in", req.body.user_locations);
    }

    if (!_.isEmpty(req.body.users)) {
        dataQuery.andWhere("responses.user_id", "in", req.body.users);
    }

    if (!_.isEmpty(req.body.response_types)) {
        dataQuery.andWhere("responses.response_type", "in", req.body.response_types);
    }

    if (!_.isEmpty(req.body.satisfied)) {
        dataQuery.andWhere("satisfied", "in", req.body.satisfied);
    }

    if (!_.isEmpty(req.body.is_starred)) {
        dataQuery.andWhere("is_starred", "in", req.body.is_starred);
    }

    let tsVectorQuery;
    let tsVectorLanguage;
    if (req.body.keyword) {
        ({ tsVectorLanguage, tsVectorQuery } = applySearchConditions(dataQuery, req.body.keyword));
    }

    // if a full-text search is being performed, use the 'ts_headline' PostgreSQL function to highlight the keywords in
    // the idea, otherwise select the idea normally
    if (tsVectorLanguage && tsVectorQuery) {
        dataQuery.select(
            knex.raw(
                "ts_headline(:queryLanguage, idea, to_tsquery(:queryLanguage, :vectorQuery), 'StartSel = <em>, StopSel = </em>, HighlightAll=TRUE') AS idea",
                {
                    queryLanguage: tsVectorLanguage,
                    vectorQuery: tsVectorQuery,
                },
            ),
        );
    }
    else {
        dataQuery.select("responses.idea");
    }

    dataQuery.select(
        "responses.id",
        "responses.created_at",
        "responses.uploaded_at",
        "responses.satisfied",
        "responses.is_starred",
        "responses.idea_language",
        "service_types.name AS service_type",
        "settlements.name AS location",
        "service_points.name AS service_point",
        "userLocation.name AS user_location",
        "users.email AS user",
        knex.raw("ARRAY_TO_STRING(ARRAY_AGG(DISTINCT all_tags.name), ',') AS tags"),
    ).groupBy(
        "responses.id",
        "service_type",
        "location",
        "service_point",
        "user_location",
        "user",
    ).orderBy("responses.id", "desc");

    const countQuery = knex(dataQuery.clone().as("data")).count();
    const nonSyndicatedResponsesCountQuery = knex(dataQuery.clone().as("data").where("responses.id", "<", 1000000000)).count();

    if (req.body.sort) {
        dataQuery.clearOrder().orderBy(req.body.sort.by, req.body.sort.order);
    }

    if (req.body.limit) {
        dataQuery.limit(parseInt(req.body.limit, 10));
    }

    if (req.body.page) {
        dataQuery.offset((parseInt(req.body.page, 10) - 1) * parseInt(req.body.limit, 10));
    }

    Promise.all([countQuery, dataQuery, nonSyndicatedResponsesCountQuery]).then((results) => {
        const [countResult, queryResult, nonSyndicatedResponsesCountResult] = results;
        resp.count = parseInt(countResult[0].count, 10);
        resp.nonSyndicatedResponsesCount = parseInt(nonSyndicatedResponsesCountResult[0].count, 10);
        resp.data = queryResult;
        res.status(200).json(resp);
    }).catch((err) => {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    });
});

// GET /count => get count of all responses
router.get('/count', function (req, res, next) {
    if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
        debug('Get responses count error : Insufficient permissions(401)');
        res.status(401).json({ error: "Insufficient permissions" });
        return;
    }

    const results = knex.select("satisfied")
        .count("satisfied as cnt")
        .from("responses")
        .groupBy("satisfied");

    results.then((results) => {
        res.status(200).json(results).end();
    }).catch((err) => {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    });
});

// GET /responses/id
// Description: Get response for admin panel, with the given id.
// @@ URL params @@
// id (integer) : required => id of the response
router.get("/:id", (req, res, next) => {
    if (!Number.isInteger(parseInt(req.params.id, 10))) {
        debug("Get response error : Bad request(400)");
        res.status(400).json({ error: "Bad request" });
        return;
    }

    if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
        debug("Get response error : Insufficient permissions(401)");
        res.status(401).json({ error: "Insufficient permissions" });
        return;
    }

    const { id } = req.params;
    debug(`Get response => ${id}`);

    const resp = {
        data: {},
    };

    const dataSet = knex.select(
        "responses.id",
        "responses.idea",
        "countries.name AS country",
        "settlements.name AS location",
        "service_points.name AS service_point",
        "service_types.name AS service_type",
        "responses.satisfied",
        "responses.response_type",
        "responses.created_at",
        "responses.updated_at",
        "responses.uploaded_at",
        "responses.is_starred",
        "responses.lat",
        "responses.lng",
        "users.email",
    )
        .from("responses")
        .leftJoin("service_points", "service_points.id", "responses.service_point_id")
        .leftJoin("service_types", "service_types.id", "service_points.service_type_id")
        .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
        .leftJoin("countries", "countries.id", "settlements.country_id")
        .leftJoin("users", "responses.user_id", "users.id")
        .where("responses.id", id);

    dataSet.then((results) => {
        resp.data = results;
        res.status(200).json(resp);
    }).catch((err) => {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    });
});

const getDistinct = (onValue, responseIds) => {
    if (onValue === "created_at" || onValue === "uploaded_at") {
        return knex("responses").select(
            knex.raw(`DISTINCT DATE_TRUNC('day', ${onValue}) as ${onValue}`),
        ).whereIn("id", responseIds);
    }

    return knex("responses").distinct(onValue).whereIn("id", responseIds);
};

const getLocationName = async (servicePointId) => {
    const result = await knex.select("settlements.name")
        .from("service_points")
        .innerJoin("settlements", "settlements.id", "service_points.settlement_id")
        .where("service_points.id", servicePointId);
    return result[0].name;
};

const updateCreatedAtToUploadedAt = async (req, res) => {
    const responseIds = req.body.response_ids;
    const distinctOnCreatedAt = await getDistinct("created_at", responseIds);
    const distinctOnUploadedAt = await getDistinct("uploaded_at", responseIds);

    if (distinctOnCreatedAt.length !== 1 || distinctOnUploadedAt.length !== 1) {
        throw new InvalidParamsError(
            "Update responses", "Selected responses must all have the same 'created_at' and 'uploaded_at' dates",
        );
    }

    const newDate = moment(distinctOnUploadedAt[0].uploaded_at).format();
    const oldDate = moment(distinctOnCreatedAt[0].created_at).format();

    const reverseQuery = knex(knex.raw(
        `
        UPDATE responses
        SET created_at = '${oldDate}'::timestamptz + make_interval(
            hours => EXTRACT(HOUR FROM created_at)::integer,
            mins => EXTRACT(MINUTE FROM created_at)::integer,
            secs => EXTRACT(SECOND FROM created_at)
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${responseIds.map(() => { return "?"; }).join(",")})
        `, // see note about array bindings here: https://knexjs.org/#Raw-Bindings
        [...responseIds],
    )).toSQL().toNative();

    return transaction(knex, async (trx) => {
        await knex.raw(
            `
            UPDATE responses
            SET created_at = '${newDate}'::timestamptz + make_interval(
                hours => EXTRACT(HOUR FROM created_at)::integer,
                mins => EXTRACT(MINUTE FROM created_at)::integer,
                secs => EXTRACT(SECOND FROM created_at)
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id IN (${responseIds.map(() => { return "?"; }).join(",")})
            RETURNING id, service_point_id
            `, // see note about array bindings here: https://knexjs.org/#Raw-Bindings
            [...responseIds],
        ).transacting(trx).then(async (result) => {
            if (!result.rows.length) {
                throw new ResourceNotFoundError("Update responses", "Provided response IDs do not exist");
            }

            const ids = result.rows.map((row) => {
                return row.id;
            });
            const locationName = await getLocationName(result.rows[0].service_point_id);

            await createAuditEmailTask(
                newDate,
                oldDate,
                "Created At",
                ids,
                req.user.email,
                reverseQuery,
                req,
            );
            await createSendToSlackTask(
                newDate,
                oldDate,
                "Created At",
                locationName,
                ids,
                req.user.email,
                reverseQuery,
                req,
            );

            res.status(200).json({
                ids: ids,
                state: "updated",
            });
        }).catch((error) => {
            errorHandler(error, res, req);
        });
    });
};

const updateServicePoint = async (req, res) => {
    const responseIds = req.body.response_ids;
    const newServicePointId = req.body.new_service_point_id;

    if (!newServicePointId) {
        throw new InvalidParamsError("Update responses", "Missing 'new_service_point_id' parameter");
    }

    const distinctOnServicePointId = await getDistinct("service_point_id", responseIds);
    if (distinctOnServicePointId.length !== 1) {
        throw new InvalidParamsError(
            "Update responses", "Selected responses must all have the same 'service_point_id'",
        );
    }

    const oldServicePointId = distinctOnServicePointId[0].service_point_id;

    const reverseQuery = knex("responses")
        .whereIn("id", responseIds)
        .update({
            service_point_id: oldServicePointId,
            updated_at: "CURRENT_TIMESTAMP",
        })
        .toSQL()
        .toNative();

    return transaction(knex, async (trx) => {
        await knex("responses")
            .transacting(trx)
            .whereIn("id", responseIds)
            .update({
                service_point_id: newServicePointId,
                updated_at: knex.fn.now(),
            })
            .returning(["id", "service_point_id"])
            .then(async (result) => {
                if (!result.length) {
                    throw new ResourceNotFoundError("Update responses", "Provided response IDs do not exist");
                }

                const ids = result.map((row) => {
                    return row.id;
                });
                const locationName = await getLocationName(result[0].service_point_id);

                await createAuditEmailTask(
                    newServicePointId,
                    oldServicePointId,
                    "Service Point Id",
                    ids,
                    req.user.email,
                    reverseQuery,
                    req,
                );
                await createSendToSlackTask(
                    newServicePointId,
                    oldServicePointId,
                    "Service Point Id",
                    locationName,
                    ids,
                    req.user.email,
                    reverseQuery,
                    req,
                );

                res.status(200).json({
                    ids: ids,
                    state: "updated",
                });
            })
            .catch((error) => {
                errorHandler(error, res, req);
            });
    });
};

const updateIdeaLanguage = async (req, res) => {
    const responseIds = req.body.response_ids;
    const newIdeaLanguage = req.body.new_idea_lang;

    if (!newIdeaLanguage) {
        throw new InvalidParamsError("Update responses", "Missing 'new_idea_lang' parameter");
    }

    const distinctOnIdeaLanguage = await getDistinct("idea_language", responseIds);
    if (distinctOnIdeaLanguage.length !== 1) {
        throw new InvalidParamsError(
            "Update responses", "Selected responses must all have the same 'idea_language'",
        );
    }

    const oldIdeaLanguage = distinctOnIdeaLanguage[0].idea_language;

    const reverseQuery = knex("responses")
        .whereIn("id", responseIds)
        .update({
            idea_language: oldIdeaLanguage,
            updated_at: "CURRENT_TIMESTAMP",
        })
        .toSQL()
        .toNative();

    return transaction(knex, async (trx) => {
        await knex("responses")
            .transacting(trx)
            .whereIn("id", responseIds)
            .update({
                idea_language: newIdeaLanguage,
                updated_at: knex.fn.now(),
            })
            .returning(["id", "service_point_id"])
            .then(async (result) => {
                if (!result.length) {
                    throw new ResourceNotFoundError("Update responses", "Provided response IDs do not exist");
                }

                const ids = result.map((row) => {
                    return row.id;
                });
                const locationName = await getLocationName(result[0].service_point_id);

                await createAuditEmailTask(
                    newIdeaLanguage,
                    oldIdeaLanguage,
                    "Idea Language",
                    ids,
                    req.user.email,
                    reverseQuery,
                    req,
                );
                await createSendToSlackTask(
                    newIdeaLanguage,
                    oldIdeaLanguage,
                    "Idea Language",
                    locationName,
                    ids,
                    req.user.email,
                    reverseQuery,
                    req,
                );

                res.status(200).json({
                    ids: ids,
                    state: "updated",
                });
            })
            .catch((error) => {
                errorHandler(error, res, req);
            });
    });
};

// PATCH /responses/admin/update
// Description: Updates a set of responses for data-fix purposes, based on the supplied action and corresponding
//              parameters.
// @@ POST params @@
// response_ids (array[integer]) : required => response IDs
// action (string : "<change_service_point|reset_date_to_uploaded>"): required => the action to perform
// new_service_point_id (integer) : required if action === "change_service_point" => the new service point ID
router.patch("/admin/update", async (req, res) => {
    try {
        const { user } = req;
        const { action } = req.body;
        const responseIds = req.body.response_ids;

        if (!user.is_admin) {
            throw new InsufficientPermissionsError("Update responses");
        }

        if (!action || !responseIds || responseIds.length < 1) {
            throw new InvalidParamsError("Update responses", "Missing 'action' and/or 'response_ids' parameters");
        }

        if (action === "reset_date_to_uploaded") {
            await updateCreatedAtToUploadedAt(req, res);
        }
        else if (action === "change_service_point") {
            await updateServicePoint(req, res);
        }
        else if (action === "change_idea_language") {
            await updateIdeaLanguage(req, res);
        }
        else {
            throw new InvalidParamsError("Update responses", "Invalid value provided for 'action' parameter");
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

module.exports = {
    router,
    // below are re-used
    retrieveVectorisationLanguage,
    createResponseCountAggregationTask,
    insertResponses,
    createIdeaLangDetectTask,
};
