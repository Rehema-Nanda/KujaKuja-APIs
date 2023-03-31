const debug = require("debug")("kk:themes");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const knex = require("../knex");

const {
    FRONTEND_LOGIN_REQUIRED,
} = process.env;

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

const TOP_ADJECTIVES_PER_SERVICE_TYPE = 20;


// POST /
// Description: get response idea themes
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// points (array[integer]) : optional => list of service point IDs
// types (array[integer]) : optional => list of service type IDs
router.post("/", (req, res) => {
    try {
        debug("Get response idea themes");

        let start; let end;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get response idea themes");
        }

        if (req.body.start) {
            start = moment.utc(req.body.start, "YYYY-MM-DD", true);
            if (!start.isValid()) {
                const errorMsg = `Invalid start date format. Expected YYYY-MM-DD, got: ${req.body.start}`;
                throw new InvalidParamsError("Get response idea themes", errorMsg);
            }
        }
        else {
            start = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
            if (!end.isValid()) {
                const errorMsg = `Invalid end date format. Expected YYYY-MM-DD, got: ${req.body.end}`;
                throw new InvalidParamsError("Get response idea themes", errorMsg);
            }
        }
        else {
            end = moment.utc().startOf("day");
        }

        debug(`start: ${start}`);
        debug(`end: ${end}`);

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
            servicePointIdsQuery.where("service_points.service_type_id", "in", req.body.types);
        }

        const response = {
            dates: {
                start: start.format(),
                end: end.format(),
            },
        };

        knex.raw(
            "SELECT rank_filter.service_type_name, rank_filter.sum, rank_filter.adjective_name FROM ("
            + "    SELECT service_types.name AS service_type_name, SUM(responses_adjectives.count), adjectives.name AS adjective_name, "
            + "    ROW_NUMBER() OVER (PARTITION BY service_types.name ORDER BY SUM(responses_adjectives.count) DESC) "
            + '    FROM "responses" '
            + '    INNER JOIN "service_points" ON "service_points"."id" = "responses"."service_point_id" '
            + '    INNER JOIN "service_types" ON "service_types"."id" = "service_points"."service_type_id" '
            + '    INNER JOIN "responses_adjectives" ON "responses_adjectives"."response_id" = "responses"."id" '
            + '    INNER JOIN "adjectives" ON "adjectives"."id" = "responses_adjectives"."adjective_id" '
            + '    WHERE "service_points"."id" IN (:servicePointIdsQuery) '
            + "    AND responses.created_at >= :start "
            + "    AND responses.created_at < :end "
            + "    GROUP BY service_types.name, adjectives.name "
            + "    ORDER BY service_types.name, SUM(responses_adjectives.count) DESC "
            + ") rank_filter "
            + "WHERE ROW_NUMBER <= :TOP_ADJECTIVES_PER_SERVICE_TYPE",
            {
                servicePointIdsQuery: servicePointIdsQuery,
                start: start.format(),
                end: end.format(),
                TOP_ADJECTIVES_PER_SERVICE_TYPE: TOP_ADJECTIVES_PER_SERVICE_TYPE,
            },
        ).then((results) => {
            const serviceTypeAdjectivesMap = {};
            _.forEach(results.rows, (row) => {
                // eslint-disable-next-line no-prototype-builtins
                if (!serviceTypeAdjectivesMap.hasOwnProperty(row.service_type_name)) {
                    serviceTypeAdjectivesMap[row.service_type_name] = {};
                }

                serviceTypeAdjectivesMap[row.service_type_name][row.adjective_name] = row.sum;
            });

            const themeBubblesDataMap = { name: "Themes", children: [] };
            _.forEach(serviceTypeAdjectivesMap, (adjectivesMap, serviceTypeName) => {
                const serviceTypeChild = { name: serviceTypeName, children: [] };

                _.forEach(adjectivesMap, (count, adjective) => {
                    serviceTypeChild.children.push({ name: adjective, count: parseInt(count, 10) });
                });

                themeBubblesDataMap.children.push(serviceTypeChild);
            });

            response.themes = themeBubblesDataMap;
            res.status(200).json(response);
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

module.exports = router;
