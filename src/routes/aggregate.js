const debug = require("debug")("kk:aggregate");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const knex = require("../knex");

const { FRONTEND_LOGIN_REQUIRED } = process.env;

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");


// POST /responses
/*
Description: Get an aggregate of the count of all responses, count of positive responses,
percentage of positive responses and delta change of percentage of positive responses.
*/
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// points (array[integer]) : optional => list of service point IDs
// types (array[integer]) : optional => list of service type IDs
router.post("/responses", async (req, res) => {
    try {
        debug("Get responses aggregate");
        let end; let start1;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get responses aggregate");
        }

        if (req.body.start) {
            start1 = moment.utc(req.body.start, "YYYY-MM-DD", true);
            if (!start1.isValid()) {
                const errorMsg = `Invalid start date format. Expected YYYY-MM-DD, got: ${req.body.start}`;
                throw new InvalidParamsError("Get responses aggregate", errorMsg);
            }
        }
        else {
            start1 = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
            if (!end.isValid()) {
                const errorMsg = `Invalid end date format. Expected YYYY-MM-DD, got: ${req.body.end}`;
                throw new InvalidParamsError("Get responses aggregate", errorMsg);
            }
        }
        else {
            end = moment.utc().startOf("day");
        }

        if (start1 > end) {
            const tmp = end;
            end = start1;
            start1 = tmp;
        }

        const start2 = start1.clone();
        start2.subtract(end.diff(start1, "days"), "days");

        debug(`start1: ${start1}`);
        debug(`end: ${end}`);
        debug(`start2: ${start2}`);

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
            dates: {
                start1: start1.format(),
                start2: start2.format(),
                end: end.format(),
            },
            satisfied1: 0,
            total1: 0,
            pourcent1: 0,
            satisfied2: 0,
            total2: 0,
            pourcent2: 0,
            delta: 0,
        };

        const resultCount1 = knex("responses").select("responses.satisfied").count("responses.satisfied as cnt")
            .where("responses.service_point_id", "in", servicePointIdsQuery)
            .andWhere("responses.created_at", ">=", start1.format())
            .andWhere("responses.created_at", "<", end.format())
            .groupBy("responses.satisfied");

        const resultCount2 = knex("responses").select("responses.satisfied").count("responses.satisfied as cnt")
            .where("responses.service_point_id", "in", servicePointIdsQuery)
            .andWhere("responses.created_at", ">=", start2.format())
            .andWhere("responses.created_at", "<", start1.format())
            .groupBy("responses.satisfied");

        const getTotalAndSatisfiedCount = (responseRecords) => {
            let total = 0;
            let satisfied = 0;

            (responseRecords || []).forEach((record) => {
                total += parseInt(record.cnt, 10);
                if (record.satisfied) {
                    satisfied = parseInt(record.cnt, 10);
                }
            });

            return {
                total: total,
                satisfied: satisfied,
            };
        };

        // returns the satisfaction percentage
        const getSatisfactionPercentage = (total, satisfied) => {
            return (total !== 0) ? (satisfied / total) * 100 : null;
        };

        const getDelta = (percentage1, percentage2) => {
            let delta = 0;
            if (percentage1 === null || percentage2 === null) {
                return delta;
            }
            if (resp.pourcent2 !== 0) {
                delta = ((percentage1 - percentage2) / percentage2) * 100;
            }
            else {
                delta = (percentage1 - percentage2);
            }
            return delta;
        };

        let total; let satisfied;

        const results1 = await resultCount1;
        ({ total, satisfied } = getTotalAndSatisfiedCount(results1));
        resp.satisfied1 = total;
        resp.total1 = satisfied;
        resp.pourcent1 = getSatisfactionPercentage(total, satisfied);

        const results2 = await resultCount2;
        ({ total, satisfied } = getTotalAndSatisfiedCount(results2));
        resp.satisfied2 = total;
        resp.total2 = satisfied;
        resp.pourcent2 = getSatisfactionPercentage(total, satisfied);

        resp.delta = getDelta(resp.pourcent1, resp.pourcent2);
        res.status(200).json(resp);
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// POST /responses/details
// Description: Get the count of all responses, count of positive responses,
//              percentage of positive responses and delta change of percentage of positive responses.
//              Returns an object of objects, one per day.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// points (array[integer]) : optional => list of service point IDs
// types (array[integer]) : optional => list of service type IDs
router.post("/responses/details", (req, res) => {
    try {
        debug("Get responses aggregate details");
        let end; let start;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get responses aggregate details");
        }

        if (req.body.start) {
            start = moment.utc(req.body.start, "YYYY-MM-DD", true);
            if (!start.isValid()) {
                const errorMsg = `Invalid start date format. Expected YYYY-MM-DD, got: ${req.body.start}`;
                throw new InvalidParamsError("Get responses aggregate details", errorMsg);
            }
        }
        else {
            start = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
            if (!end.isValid()) {
                const errorMsg = `Invalid end date format. Expected YYYY-MM-DD, got: ${req.body.end}`;
                throw new InvalidParamsError("Get responses aggregate details", errorMsg);
            }
        }
        else {
            end = moment.utc().startOf("day");
        }

        if (start > end) {
            const tmp = end;
            end = start;
            start = tmp;
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
            servicePointIdsQuery.where("service_types.id", "in", req.body.types);
        }

        const resp = {
            dates: {
                start: start.format(),
                end: end.format(),
            },
            count: 0,
            data: {},
        };

        // always set start to one day earlier -
        // we need this for the delta calculation of the start date requested by the client
        // note that there might not be data on that day,
        // so the delta can still be 0 for the start date requested by the client
        // TODO: find the previous day that has data,
        // so that it's less likely that the delta is 0 for the start date requested by the client
        start.subtract(1, "days");

        // Construct response.data object in front, so we can have sub-object for date that doesn't have any datas.
        // That allow us to display 'NODATA' card on the front end
        for (let i = start.clone(); i <= end; i.add(1, "days")) {
            resp.data[i.format("YYYY-MM-DD")] = {
                date: i.format("YYYY-MM-DD"),
                satisfied: 0,
                total: 0,
                pourcent: 0,
                delta: 0,
            };
            resp.count++;
        }

        // debug(`start: ${start}`);
        // debug(`end: ${end}`);

        // TODO: we should be able to make this simpler by using groupByRaw and DATE_TRUNC
        // (group by satisfied and created_at truncated to the date only)
        knex("responses").select(
            "responses.created_at",
            "responses.satisfied",
        )
            .where("responses.service_point_id", "in", servicePointIdsQuery)
            .andWhere("responses.created_at", ">=", start.format())
            .andWhere("responses.created_at", "<", end.format())
            .orderBy("responses.created_at", "asc")
            .then((results) => {
                _.forEach(results, (row) => {
                    const date = moment(row.created_at);
                    const dateBefore = date.clone().subtract(1, "days");
                    const formattedDate = date.format("YYYY-MM-DD");
                    const formattedDateBefore = dateBefore.format("YYYY-MM-DD");

                    if (!resp.data[formattedDate]) {
                        throw new Error(`${formattedDate} was not initialized in resp.data!`);
                    }

                    if (row.satisfied) {
                        // eslint-disable-next-line no-plusplus
                        resp.data[formattedDate].satisfied++;
                    }

                    // eslint-disable-next-line no-plusplus
                    resp.data[formattedDate].total++;
                    const pourcent = (resp.data[formattedDate].satisfied / resp.data[formattedDate].total) * 100;
                    if (!Number.isNaN(pourcent)) {
                        resp.data[formattedDate].pourcent = pourcent;
                    }
                    // delta calculation
                    if (resp.data[formattedDateBefore]) {
                        let delta = 0;
                        if (resp.data[formattedDateBefore].pourcent !== 0) {
                            delta = ((resp.data[formattedDate].pourcent - resp.data[formattedDateBefore].pourcent) / resp.data[formattedDateBefore].pourcent) * 100;
                        }
                        else {
                            delta = (resp.data[formattedDate].pourcent - resp.data[formattedDateBefore].pourcent);
                        }
                        if (!Number.isNaN(delta)) {
                            resp.data[formattedDate].delta = delta;
                        }
                    }
                });

                // delete the extra day that we fetched for delta calculation
                delete resp.data[start.format("YYYY-MM-DD")];

                res.status(200).json(resp);
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
