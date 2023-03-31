const debug = require("debug")("kk:snapshots");
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


const findPreviousOrNextPeriodWithData = async (
    start, end, daysDiff, settlementSpecificServicePointIdsQuery, snapshotsFunction, maxIterations = 5,
) => {
    /* retrieve snapshot data for previous/next time period and go back/forward in time if no records found,
    for a maximum of 5 iterations
    */
    // NB: direction is determined by whether the 'daysDiff' parameter is positive or negative
    let counter = 1;
    let previousOrNextPeriodSnapshots = { rows: [] };
    const previousOrNextStart = start.clone();
    const previousOrNextEnd = end.clone();
    const startOfToday = moment.utc().startOf("day");

    do {
        if (daysDiff > 0 && previousOrNextStart.clone().add(daysDiff, "days").diff(startOfToday, "days") >= 0) {
            // don't include today and don't look into the future
            break;
        }

        previousOrNextStart.add(daysDiff, "days");
        previousOrNextEnd.add(daysDiff, "days");
        // eslint-disable-next-line no-await-in-loop
        previousOrNextPeriodSnapshots = await snapshotsFunction(
            previousOrNextStart, previousOrNextEnd, settlementSpecificServicePointIdsQuery,
        );
        counter++;
    } while (previousOrNextPeriodSnapshots.rows.length === 0 && counter < maxIterations);

    return [previousOrNextPeriodSnapshots, previousOrNextStart, previousOrNextEnd];
};

const settlementSnapshots = async (start, end, servicePointIdsQuery) => {
    return knex.raw(
        `
        SELECT
            countries.id AS country_id,
            countries.name AS country_name,
            settlements.id AS settlement_id,
            settlements.name AS settlement_name,
            COUNT(responses.id) AS number_of_responses,
            SUM(CASE WHEN responses.satisfied = TRUE THEN 1 ELSE 0 END) AS number_satisfied,
            most_recent_idea.idea AS featured_idea

        FROM responses
        INNER JOIN service_points ON service_points.id = responses.service_point_id
        INNER JOIN settlements ON settlements.id = service_points.settlement_id
        INNER JOIN countries ON countries.id = settlements.country_id
        LEFT JOIN (
            SELECT DISTINCT ON (settlement_id) *
            FROM featured_ideas
            WHERE created_at >= :featuredIdeasStart
            AND created_at <= :featuredIdeasEnd
            ORDER BY settlement_id, created_at DESC
        ) AS most_recent_idea ON settlements.id = most_recent_idea.settlement_id

        WHERE responses.service_point_id IN (:servicePointIdsQuery)
        AND responses.created_at >= :start
        AND responses.created_at < :end
        GROUP BY countries.id, settlements.id, most_recent_idea.idea
        ORDER BY settlements.name ASC
        `,
        {
            start: start.format(),
            end: end.format(),
            featuredIdeasStart: start.clone().add(12, "hours").format(),
            featuredIdeasEnd: end.clone().add(12, "hours").format(),
            servicePointIdsQuery: servicePointIdsQuery,
        },
    );
};

const serviceTypeSnapshots = async (start, end, servicePointIdsQuery) => {
    return knex.raw(
        `
        SELECT
            service_points.settlement_id,
            service_types.id AS service_type_id,
            service_types.name AS service_type_name,
            COUNT(responses.id) AS number_of_responses,
            SUM(CASE WHEN responses.satisfied = TRUE THEN 1 ELSE 0 END) AS number_satisfied

        FROM responses
        INNER JOIN service_points ON service_points.id = responses.service_point_id
        INNER JOIN service_types ON service_types.id = service_points.service_type_id

        WHERE responses.service_point_id IN (:servicePointIdsQuery)
        AND responses.created_at >= :start
        AND responses.created_at < :end
        GROUP BY service_points.settlement_id, service_types.id
        ORDER BY service_types.name
        `,
        {
            start: start.format(),
            end: end.format(),
            servicePointIdsQuery: servicePointIdsQuery,
        },
    );
};

const servicePointSnapshots = async (start, end, servicePointIdsQuery) => {
    return knex.raw(
        `
        SELECT
            service_points.settlement_id,
            service_points.id AS service_point_id,
            service_points.name AS service_point_name,
            COUNT(responses.id) AS number_of_responses,
            SUM(CASE WHEN responses.satisfied = TRUE THEN 1 ELSE 0 END) AS number_satisfied

        FROM responses
        INNER JOIN service_points ON service_points.id = responses.service_point_id

        WHERE responses.service_point_id IN (:servicePointIdsQuery)
        AND responses.created_at >= :start
        AND responses.created_at < :end
        GROUP BY service_points.settlement_id, service_points.id
        ORDER BY service_points.name
        `,
        {
            start: start.format(),
            end: end.format(),
            servicePointIdsQuery: servicePointIdsQuery,
        },
    );
};

// POST /
// Description: Get location snapshot data, optionally filtered by the given parameters.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// service_types (array[integer]) : optional => list of service type IDs
router.post("/", async (req, res) => {
    try {
        let start; let end;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get location snapshot data");
        }

        if (req.body.start) {
            start = moment.utc(req.body.start, "YYYY-MM-DD", true);
        }
        else {
            start = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
        }
        else {
            end = moment.utc().startOf("day");
        }
        if (!start.isValid() || !end.isValid()) {
            throw new InvalidParamsError("Get location snapshot data");
        }

        if (start > end) {
            const tmp = end;
            end = start;
            start = tmp;
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

        if (!_.isEmpty(req.body.service_types)) {
            servicePointIdsQuery.where("service_types.id", "in", req.body.service_types);
        }

        const currentPeriodSnapshots = await settlementSnapshots(start, end, servicePointIdsQuery);

        const resp = {
            count: 0,
            data: [],
        };

        // if no records, return immediately
        if (currentPeriodSnapshots.rows.length === 0) {
            res.status(200).json(resp);
            return;
        }

        const snapshots = [];
        const daysDiff = end.diff(start, "days");

        // eslint-disable-next-line no-restricted-syntax
        for (const snapshot of currentPeriodSnapshots.rows) {
            const settlementSpecificServicePointIdsQuery = servicePointIdsQuery.clone().where("settlements.id", snapshot.settlement_id);

            // eslint-disable-next-line no-await-in-loop
            const [prevPeriodSnapshots, previousStart, previousEnd] = await findPreviousOrNextPeriodWithData(
                start, end, -daysDiff, settlementSpecificServicePointIdsQuery, settlementSnapshots,
            );

            // eslint-disable-next-line no-await-in-loop
            const [nextPeriodSnapshots, nextStart, nextEnd] = await findPreviousOrNextPeriodWithData(
                start, end, daysDiff, settlementSpecificServicePointIdsQuery, settlementSnapshots,
            );

            // look for equivalent record for this settlement in previous and next period
            const prevSnapshot = prevPeriodSnapshots.rows && prevPeriodSnapshots.rows.length > 0
                ? prevPeriodSnapshots.rows[0] : null;
            const nextSnapshot = nextPeriodSnapshots.rows && nextPeriodSnapshots.rows.length > 0
                ? nextPeriodSnapshots.rows[0] : null;

            // calculate averages for each period
            const avg = (snapshot.number_satisfied / snapshot.number_of_responses) * 100;
            const prevAvg = prevSnapshot ? (prevSnapshot.number_satisfied / prevSnapshot.number_of_responses) * 100 : null;
            const nextAvg = nextSnapshot ? (nextSnapshot.number_satisfied / nextSnapshot.number_of_responses) * 100 : null;

            // calculate delta
            const delta = prevAvg ? avg - prevAvg : null;

            snapshots.push({

                region: {
                    id: parseInt(snapshot.settlement_id, 10),
                    type: "Settlement",
                    name: snapshot.settlement_name,
                    parent_name: snapshot.country_name,
                    parent_id: parseInt(snapshot.country_id, 10),
                },
                interval: {
                    start: start.format(),
                    end: end.format(),
                    average: avg,
                    responses: parseInt(snapshot.number_of_responses, 10),
                    satisfied: parseInt(snapshot.number_satisfied, 10),
                    delta: delta,
                },
                featured_idea: snapshot.featured_idea,
                previous: {
                    start: previousStart.format(),
                    end: previousEnd.format(),
                    average: prevAvg,
                    responses: prevSnapshot ? parseInt(prevSnapshot.number_of_responses, 10) : null,
                    satisfied: prevSnapshot ? parseInt(prevSnapshot.number_satisfied, 10) : null,
                },
                next: {
                    start: nextStart.format(),
                    end: nextEnd.format(),
                    average: nextAvg,
                    responses: nextSnapshot ? parseInt(nextSnapshot.number_of_responses, 10) : null,
                    satisfied: nextSnapshot ? parseInt(nextSnapshot.number_satisfied, 10) : null,
                },

            });
        }

        resp.count = snapshots.length;
        resp.data = snapshots;

        res.status(200).json(resp);
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

// POST /service_types
// Description: Get service-type snapshot data grouped by location, optionally filtered by the given parameters.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// service_types (array[integer]) : optional => list of service type IDs
router.post("/service_types", async (req, res) => {
    try {
        let start; let end;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get service-type snapshot data");
        }

        if (req.body.start) {
            start = moment.utc(req.body.start, "YYYY-MM-DD", true);
        }
        else {
            start = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
        }
        else {
            end = moment.utc().startOf("day");
        }

        if (!start.isValid() || !end.isValid()) {
            throw new InvalidParamsError("Get service-type snapshot data");
        }

        if (start > end) {
            const tmp = end;
            end = start;
            start = tmp;
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

        if (!_.isEmpty(req.body.service_types)) {
            servicePointIdsQuery.where("service_types.id", "in", req.body.service_types);
        }

        const currentPeriodSnapshots = await serviceTypeSnapshots(start, end, servicePointIdsQuery);

        const resp = {
            count: 0,
            data: {},
        };

        // if no records, return immediately
        if (currentPeriodSnapshots.rows.length === 0) {
            res.status(200).json(resp);
            return;
        }

        const daysDiff = end.diff(start, "days");

        // eslint-disable-next-line no-restricted-syntax
        for (const snapshot of currentPeriodSnapshots.rows) {
            const settlementSpecificServicePointIdsQuery = servicePointIdsQuery.clone().where("settlements.id", snapshot.settlement_id);

            // eslint-disable-next-line no-await-in-loop
            const [prevPeriodSnapshots] = await findPreviousOrNextPeriodWithData(
                start, end, -daysDiff, settlementSpecificServicePointIdsQuery, serviceTypeSnapshots,
            );

            // look for equivalent record for this settlement in previous and next period
            const prevSnapshot = (prevPeriodSnapshots.rows || []).find(
                (row) => row.service_type_id === snapshot.service_type_id,
            );

            // calculate averages for each period
            const avg = (snapshot.number_satisfied / snapshot.number_of_responses) * 100;
            const prevAvg = prevSnapshot ? (prevSnapshot.number_satisfied / prevSnapshot.number_of_responses) * 100 : null;

            // calculate delta
            const delta = prevAvg ? avg - prevAvg : null;

            // eslint-disable-next-line no-prototype-builtins
            if (!resp.data.hasOwnProperty(snapshot.settlement_id)) {
                resp.data[snapshot.settlement_id] = [];
            }

            resp.data[snapshot.settlement_id].push({

                service_type_id: parseInt(snapshot.service_type_id, 10),
                service_type_name: snapshot.service_type_name,
                average: avg,
                responses: parseInt(snapshot.number_of_responses, 10),
                satisfied: parseInt(snapshot.number_satisfied, 10),
                delta: delta,

            });
        }

        resp.count = Object.keys(resp.data).length;

        res.status(200).json(resp);
    }
    catch (err) {
        errorHandler(err, res, req);
    }
});

// POST /service_points
// Description: Get service-point snapshot data grouped by location, optionally filtered by the given parameters.
// @@ URL params @@
// @@ POST params @@
// start (date : YYYY-MM-DD) : optional => start date of the sample
// end (date : YYYY-MM-DD) : optional => end date of the sample
// countries (array[integer]) : optional => list of country IDs
// settlements (array[integer]) : optional => list of settlement IDs
// service_types (array[integer]) : optional => list of service type IDs
router.post("/service_points", async (req, res) => {
    try {
        let start; let end;

        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get service-point snapshot data");
        }

        if (req.body.start) {
            start = moment.utc(req.body.start, "YYYY-MM-DD", true);
        }
        else {
            start = moment.utc().subtract(7, "days").startOf("day");
        }

        if (req.body.end) {
            end = moment.utc(req.body.end, "YYYY-MM-DD", true);
        }
        else {
            end = moment.utc().startOf("day");
        }

        if (!start.isValid() || !end.isValid()) {
            throw new InvalidParamsError("Get service-point snapshot data");
        }
        if (start > end) {
            const tmp = end;
            end = start;
            start = tmp;
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

        if (!_.isEmpty(req.body.service_types)) {
            servicePointIdsQuery.where("service_types.id", "in", req.body.service_types);
        }

        // retrieve snapshots
        const currentPeriodSnapshots = await servicePointSnapshots(start, end, servicePointIdsQuery);

        const resp = {
            count: 0,
            data: {},
        };

        // if no records, return immediately
        if (currentPeriodSnapshots.rows.length === 0) {
            res.status(200).json(resp);
            return;
        }

        currentPeriodSnapshots.rows.forEach((snapshot) => {
            // calculate average for the period
            const avg = (snapshot.number_satisfied / snapshot.number_of_responses) * 100;

            // eslint-disable-next-line no-prototype-builtins
            if (!resp.data.hasOwnProperty(snapshot.settlement_id)) {
                resp.data[snapshot.settlement_id] = [];
            }

            resp.data[snapshot.settlement_id].push({

                service_point_id: parseInt(snapshot.service_point_id, 10),
                service_point_name: snapshot.service_point_name,
                average: avg,
                responses: parseInt(snapshot.number_of_responses, 10),
                satisfied: parseInt(snapshot.number_satisfied, 10),

            });
        });

        resp.count = Object.keys(resp.data).length;

        res.status(200).json(resp);
    }
    catch (err) {
        errorHandler(err, res, req);
    }
});


module.exports = router;
