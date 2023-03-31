const debug = require("debug")("kk:action_feeds");
const express = require("express");
const { validate } = require("jsonschema");
const _ = require("lodash");
const moment = require("moment");
const knex = require("../knex");

const {
    FRONTEND_LOGIN_REQUIRED, SLACK_ACTION_AMPLIFIER_CHANNEL_ID,
} = process.env;

const router = express.Router();
const schema = require("../models/action_feeds");

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");
const { sendMessageToSlack } = require("./task_handlers/slack_helpers");

const convertKeywordsToTextSearchVectorQuery = (keywords) => {
    // converts keywords into format expected for full-text search vector query on action description
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

const applySearchConditions = (dataQuery, keywordSearch) => {
    const searchExpression = keywordSearch.trim();
    const tagsRegex = /#[\w-]+/ig;
    const actionFeedLanguage = (process.env.ACTION_FEED_LANGUAGE || "en").trim().toLowerCase();
    let tsVectorLanguage = "pg_catalog.english";
    switch (actionFeedLanguage) {
        case "es":
            tsVectorLanguage = "pg_catalog.spanish";
            break;
        case "fr":
            tsVectorLanguage = "pg_catalog.french";
            break;
        default:
            break;
    }

    // search for tags, if the search expression contains one or more '#' characters
    if (searchExpression.includes("#")) {
        const tagMatches = searchExpression.match(tagsRegex);

        if (tagMatches !== null && tagMatches.length > 0) {
            // note that we are converting both the tags in the search expression and the tags in the tags table to
            // lower-case, to ensure case-insensitive matching
            const tagsWithoutNull = tagMatches.filter((tag) => !tag.includes("#null"));

            if (tagsWithoutNull.length > 0) {
                dataQuery.whereIn("action_feeds.tag", tagsWithoutNull);
            }
        }
    }

    // perform a text search on the search expression, if it marked as a ts-query
    if (searchExpression.startsWith("textsearch:")) {
        const tsVectorQuery = searchExpression.split(":")[1].trim();
        dataQuery.andWhereRaw(
            `action_feeds.action_feed_token_vector @@ to_tsquery(:tsVectorLanguage, :tsVectorQuery)`,
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
            `action_feeds.action_feed_token_vector @@ to_tsquery(:tsVectorLanguage, :tsVectorQuery)`,
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

const ensureRoleIfLoginRequired = (req, permissionName) => {
    if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
        throw new InsufficientPermissionsError(permissionName);
    }
};

const slackMessage = async (action) => {
    const location = await knex("settlements").select(
        "settlements.name",
        "countries.name AS country_name",
    ).innerJoin("countries", "countries.id", "settlements.country_id").where("settlements.id", action.settlement_id);

    return `Hey, your *Action Amplifier* got a new response.\n\n*Location*:\n${location[0].name}, ${location[0].country_name}\n\n*Reported by:*\n${action.email || `N/A`}\n\n*Action taken by:*\n${action.implementor || `N/A`}\n\n*Action Title:*\n${action.title}\n\n*Action Description:*\n${action.description}\n\n*Action Photo:*\n<${action.image || `N/A`}>\n\n*Date:*\n${moment(action.time).format("MMMM, YYYY")}\n\n*How many people do you think will be impacted by the action?*\n${action.numbers || `N/A`}\n\n*For these people, what was the impact?*\n${action.impact || `N/A`}\n\n*Relevant Ideafeed link:*\n${action.source || `N/A`}`;
};

/**
 * GET /action_feeds
 * Description: get all action feeds
 */
router.post("/", async (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            debug("Get response actions error : Insufficient permissions(401)");
            res.status(401).json({ error: "Insufficient permissions" });
            return;
        }

        let startDate;
        let endDate;

        if (req.body.start) {
            startDate = moment.utc(req.body.start, "YYYY-MM-DD", true);
        }
        else {
            startDate = moment.utc().subtract(1, "years").startOf("day");
        }

        if (req.body.end) {
            endDate = moment.utc(req.body.end, "YYYY-MM-DD", true);
        }
        else {
            endDate = moment.utc().endOf("day");
        }

        if (!startDate.isValid() || !endDate.isValid()) {
            res.status(400).json({ error: "Bad request" });
            return;
        }

        if (startDate > endDate) {
            const tmp = endDate;
            endDate = startDate;
            startDate = tmp;
        }

        const resp = {
            dates: {
                start: startDate.format(),
                end: endDate.format(),
            },
            count: 0,
            data: [],
        };

        const dataQuery = knex("action_feeds")
            .leftJoin("service_types", "service_types.id", "action_feeds.service_type_id")
            .leftJoin("settlements", "settlements.id", "action_feeds.settlement_id")
            .leftJoin("countries", "countries.id", "settlements.country_id")
            .where("countries.enabled", true)
            .andWhere("action_feeds.created_at", ">=", startDate.format())
            .andWhere("action_feeds.created_at", "<", endDate.format());

        if (!_.isEmpty(req.body.settlements)) {
            dataQuery.where("settlements.id", "in", req.body.settlements);
        }

        if (!_.isEmpty(req.body.countries)) {
            dataQuery.where("countries.id", "in", req.body.countries);
        }

        if (!_.isEmpty(req.body.types)) {
            dataQuery.where("service_types.id", "in", req.body.types);
        }

        if (req.body.sort) {
            dataQuery.clearOrder().orderBy(req.body.sort.by, req.body.sort.order);
        }

        if (req.body.limit) {
            dataQuery.limit(parseInt(req.body.limit, 10));
        }

        if (req.body.page) {
            dataQuery.offset((parseInt(req.body.page, 10) - 1) * parseInt(req.body.limit, 10));
        }

        let tsVectorQuery;
        let tsVectorLanguage;
        if (req.body.keyword) {
            ({ tsVectorLanguage, tsVectorQuery } = applySearchConditions(dataQuery, req.body.keyword));
        }

        // if a full-text search is being performed, use the 'ts_headline' PostgreSQL function to highlight the keywords in
        // the action description, otherwise select the action description normally
        if (tsVectorLanguage && tsVectorQuery) {
            dataQuery.select(
                knex.raw(
                    "ts_headline(:queryLanguage, description, to_tsquery(:queryLanguage, :vectorQuery), 'StartSel = <em>, StopSel = </em>, HighlightAll=TRUE') AS description",
                    {
                        queryLanguage: tsVectorLanguage,
                        vectorQuery: tsVectorQuery,
                    },
                ),
            );
        }
        else {
            dataQuery.select("action_feeds.description");
        }

        dataQuery.select(
            "action_feeds.*",
            "service_types.name AS service_type",
            "settlements.name AS location",
            "countries.name AS country",
        ).groupBy(
            "action_feeds.id", "service_types.name", "settlements.name", "countries.name",
        ).orderBy("action_feeds.created_at", "desc");

        const totalCountQuery = knex(dataQuery.clone().as("data")).count();

        if (req.body.limit) {
            dataQuery.limit(parseInt(req.body.limit, 10));
        }

        if (req.body.page) {
            dataQuery.offset((parseInt(req.body.page, 10) - 1) * parseInt(req.body.limit, 10));
        }

        Promise.all([totalCountQuery, dataQuery]).then((results) => {
            const [totalCountResult, dataQueryResult] = results;
            resp.count = parseInt(totalCountResult[0].count, 10);
            resp.data = dataQueryResult;
            res.status(200).json(resp);
        }).catch((err) => {
            debug(err);
            req.log.error(err);
            res.status(500).end();
        });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

/**
 * POST /action_feeds
 * Description: Add action feed
 */
router.post("/add", async (req, res) => {
    try {
        // if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
        //     debug("Add response actions error : Insufficient permissions(401)");
        //     res.status(401).json({ error: "Insufficient permissions" });
        //     return;
        // }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create action feed", "Missing data");
        }

        const actionFeed = req.body;
        delete actionFeed.created_at;
        delete actionFeed.updated_at;

        const validationResult = validate(actionFeed, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create action feed", validationResult.errors);
        }

        const message = await slackMessage(actionFeed);

        knex("action_feeds")
            .returning("id")
            .insert(actionFeed)
            .then(async (response) => {
                await sendMessageToSlack("add action", message, SLACK_ACTION_AMPLIFIER_CHANNEL_ID);
                res.status(200).json({
                    id: parseInt(response[0], 10),
                    state: "created",
                });
            })
            .catch((err) => {
                debug(err);
                res.status(500).end();
            });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// GET /:id? the one corresponding to id
router.get("/:id?", (req, res) => {
    try {
        ensureRoleIfLoginRequired(req, "Get single action feed");

        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Get action feed");
        }

        knex("action_feeds").select().where("id", req.params.id)
            .then((response) => {
                res.status(200).json({ data: response }).end();
            })
            .catch((err) => {
                debug(err);
                req.log.error(err);
                res.status(500).end();
            });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// PUT /:id => update action feed with id
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update action feed");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update action feed", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update action feed");
        }

        const actionFeedId = req.params.id;
        const actionFeed = req.body;
        actionFeed.updated_at = moment().format();

        const validationResult = validate(actionFeed, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update action feed");
        }

        debug("Valid object");
        knex("action_feeds")
            .where("id", actionFeedId)
            .update(actionFeed).returning("id")
            .then((result) => {
                res.status(200).json(
                    {
                        id: parseInt(result[0], 10),
                        state: "updated",
                    },
                );
            })
            .catch((err) => {
                debug(err);
                req.log.error(err);
                res.status(500).end();
            });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// DELETE /:id => delete action feed with id
router.delete("/:id", (req, res) => {
    try {
        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete action feed");
        }

        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Delete action feed");
        }

        const actionFeedId = req.params.id;

        debug("Valid object");
        knex("action_feeds")
            .where("id", actionFeedId)
            .delete()
            .returning("id")
            .then(() => {
                res.status(200).json({ id: actionFeedId, state: "deleted" });
            })
            .catch((err) => {
                debug(err);
                req.log.error(err);
                res.status(500).end();
            });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

module.exports = router;
