const debug = require("debug")("kk:service_points");
const express = require("express");

const router = express.Router();

const _ = require("lodash");
const moment = require("moment");
const { validate } = require("jsonschema");
const tz = require("../config/tz");

const knex = require("../knex");

const schema = require("../models/service_points");

const {
    FRONTEND_LOGIN_REQUIRED,
} = process.env;

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
    InternalServerError,
} = require("../utils/errorHandler");

// GET /:id? => list all service_points or the one corresponding to the given id
router.get("/:id?", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get service points");
        }

        const getServicePointQuery = knex.select("service_points.*", "service_types.name AS service_type_name", "settlements.name AS settlement_name")
            .from("service_points")
            .innerJoin("service_types", "service_points.service_type_id", "service_types.id")
            .innerJoin("settlements", "service_points.settlement_id", "settlements.id");

        const { id } = req.params;
        if (id) {
            if (!Number.isInteger(parseInt(id, 10))) {
                throw new InvalidParamsError("Get service points");
            }
            getServicePointQuery.where("service_points.id", id);
        }
        getServicePointQuery.then((results) => {
            res.status(200).json(
                {
                    count: results.length,
                    data: results,
                },
            );
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

// GET /location/:id
// Description: Get all service points from a location.
// @@ URL params @@
// id (integer) : required => id of the location
router.get("/location/:id", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get service points within a location");
        }

        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Get service points within a location");
        }

        const locationId = req.params.id;

        knex.select("service_points.*", "service_types.name AS service_type_name")
            .from("service_points")
            .innerJoin("service_types", "service_points.service_type_id", "service_types.id")
            .where("service_points.settlement_id", locationId)
            .then((results) => {
                res.status(200).json(
                    {
                        count: results.length,
                        data: results,
                    },
                ).end();
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

/**
 * POST /paginator
 * Description: Paginates service points
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get paginated service points");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex.select("service_points.*", "service_types.name AS service_type_name", "settlements.name AS settlement_name")
            .from("service_points")
            .innerJoin("service_types", "service_points.service_type_id", "service_types.id")
            .innerJoin("settlements", "service_points.settlement_id", "settlements.id")
            .where("settlements.id", "<", 1000000000);

        const countQuery = knex(results.clone().as("data")).count();

        if (req.body.sort) {
            results.clearOrder().orderBy(req.body.sort.by, req.body.sort.order);
        }

        if (req.body.limit) {
            results.limit(parseInt(req.body.limit, 10));
        }

        if (req.body.page) {
            results.offset((parseInt(req.body.page, 10) - 1) * parseInt(req.body.limit, 10));
        }

        Promise.all([countQuery, results]).then((response) => {
            const [countResult, queryResult] = response;
            resp.count = parseInt(countResult[0].count, 10);
            resp.data = queryResult;
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

// POST / => create a service_point
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create service point", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Create service point");
        }

        // eslint-disable-next-line camelcase
        const service_point = req.body;
        // don't allow clients to set these:
        delete service_point.created_at;
        delete service_point.updated_at;

        const validationResult = validate(service_point, schema.post);

        if (!validationResult.valid) {
            debug("Create service point error : Invalid data(422)");
            res.status(422).json({ error: validationResult.errors });
            return;
        }

        knex("service_points").returning("id").insert(service_point)
            .then((result) => {
                res.status(200).json(
                    {
                        id: parseInt(result[0], 10),
                        state: "created",
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

// PUT / => update a service_point
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update service point");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update service point", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update service point");
        }

        const spId = req.params.id;
        // eslint-disable-next-line camelcase
        const service_point = req.body;
        service_point.updated_at = moment().format();

        const validationResult = validate(service_point, schema.put);

        if (!validationResult.valid) {
            debug("Update service point error : Invalid data(422)");
            res.status(422).json({ error: validationResult.errors });
            return;
        }

        debug("Valid object");
        knex("service_points").where("id", spId).update(service_point).returning("id")
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

// DELETE /:id => delete a service_point
router.delete("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Delete service point");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete service point");
        }

        const spId = parseInt(req.params.id, 10);
        debug(`Delete service_point => id: ${spId}`);

        knex("service_points").where("id", spId).del()
            .then((result) => {
                res.status(200).json(
                    {
                        id: result === 0 ? null : spId,
                        state: "deleted",
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

// GET /availability/:id/:start/:end => get availability for one service point from start date to end date
router.get("/availability/:id/:start/:end", async (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get availability");
        }

        const spId = parseInt(req.params.id, 10);
        debug(`Get availability => id: ${spId}`);

        let start = moment.utc(req.params.start, "YYYY-MM-DD", true);
        let end = moment.utc(req.params.end, "YYYY-MM-DD", true);

        if (!Number.isInteger(spId) || !start.isValid() || !end.isValid()) {
            throw new InvalidParamsError("Get availability");
        }

        let isoTwoLetterCode = await knex.table("service_points")
            .innerJoin("settlements", "settlements.id", "service_points.settlement_id")
            .innerJoin("countries", "countries.id", "settlements.country_id")
            .where("service_points.id", spId)
            .first("countries.iso_two_letter_code");
        isoTwoLetterCode = isoTwoLetterCode ? isoTwoLetterCode.iso_two_letter_code : null;

        if (!isoTwoLetterCode || !tz[isoTwoLetterCode]) {
            const errorMsg = `Missing ISO two-letter country code or offset information for service point ID: ${spId}`;
            throw new InternalServerError("Get availability", errorMsg);
        }

        // adjust start and end for the service point's local time
        // TODO: use moment-timezone here
        start.utcOffset(tz[isoTwoLetterCode], true);
        end.utcOffset(tz[isoTwoLetterCode], true);

        if (start > end) {
            const tmpStart = start;
            start = end;
            end = tmpStart;
        }

        debug(`start: ${start}`);
        debug(`end: ${end}`);

        const resp = {
            count: 0,
            data: {},
        };

        // Construct response.data object in front, so we can have sub-object for date that doesn't have any datas.
        // That allow us to display 'NODATA' card on the front end
        for (let i = start.clone(); i < end; i.add(1, "days")) {
            resp.data[i.format("YYYY-MM-DD")] = {
                date: i.format("YYYY-MM-DD"),
                start: 0,
                end: 0,
                service_point_id: spId,
            };
            resp.count++;
        }

        knex.select(
            "service_point_availabilities.availability_time",
            "service_point_availabilities.available",
            "countries.iso_two_letter_code",
        )
            .from("service_point_availabilities")
            .leftJoin("service_points", "service_points.id", "service_point_availabilities.service_point_id")
            .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
            .leftJoin("countries", "countries.id", "settlements.country_id")
            .where("service_point_availabilities.service_point_id", spId)
            .andWhere("service_point_availabilities.availability_time", ">=", start.format())
            .andWhere("service_point_availabilities.availability_time", "<", end.format())
            .orderBy("service_point_availabilities.availability_time", "desc")
            .then((results) => {
                _.forEach(results, (row) => {
                // TODO: use moment-timezone here
                    const date = moment(row.availability_time).utcOffset(tz[row.iso_two_letter_code]);
                    const timeAsMinutesSinceMidnight = (date.hours() * 60) + date.minutes();
                    const formattedDate = date.format("YYYY-MM-DD");

                    if (!resp.data[formattedDate]) {
                        throw new Error(`${formattedDate} was not initialized in resp.data!`);
                    }

                    if (row.available) {
                        if (
                            resp.data[formattedDate].start > timeAsMinutesSinceMidnight
                            || resp.data[formattedDate].start === 0
                        ) {
                            resp.data[formattedDate].start = timeAsMinutesSinceMidnight;
                        }
                    }
                    else {
                        // eslint-disable-next-line no-lonely-if
                        if (resp.data[formattedDate].end < timeAsMinutesSinceMidnight) {
                            resp.data[formattedDate].end = timeAsMinutesSinceMidnight;
                        }
                    }
                });
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

class ValidationError extends Error {
    // this class is used by the post handler below and the insertServicePointAvailability function
    // it's similar to the one objection provides (eg: see Response.ValidationError in the responses route)
    // also see "ES6 Custom Error Class" at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
    constructor(data, ...params) {
        super(...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }

        this.data = data;
    }
}

const prepareServicePointAvailabilityForInsertion = async (spId, servicePointAvailability) => {
    // eslint-disable-next-line no-param-reassign
    servicePointAvailability.service_point_id = spId;
    // eslint-disable-next-line no-param-reassign
    servicePointAvailability.uploaded_at = moment().format();

    return servicePointAvailability;
};

/*
TODO: convert this endpoint for batch upload & insert
 (this follows the same pattern as the insertResponses function in the responses route)
 */
const insertServicePointAvailability = async (spId, servicePointAvailability) => {
    /*
    NB:
    service_point_availability.created_at, service_point_availability.availability_time &
    service_point_availability.unique_id should be set by the client
    */

    return knex.transaction(async (trx) => {
        const existingServicePointAvailability = await knex("service_point_availabilities").transacting(trx).where("unique_id", servicePointAvailability.unique_id).first();

        if (existingServicePointAvailability) {
            // TODO: log a warning for existingServicePointAvailability
            return Promise.resolve([existingServicePointAvailability.id]);
        }

        const preparedServicePointAvailability = await prepareServicePointAvailabilityForInsertion(
            spId, servicePointAvailability,
        );

        const validationResult = validate(preparedServicePointAvailability, schema.availability_post);

        if (!validationResult.valid) {
            throw new ValidationError(validationResult.errors);
        }

        const promise = knex("service_point_availabilities").transacting(trx).returning("id").insert(preparedServicePointAvailability);

        /*
            the transaction is committed if this promise resolves
            if this promise is rejected or an error is thrown inside of this callback function,
            the transaction is rolled back
        */
        return promise;
    });
};

/*
 POST /availability/:id => create a service point availability entry
 for the service point corresponding to the given id
*/
router.post("/availability/:id", async (req, res) => {
    try {
        const spId = parseInt(req.params.id, 10);

        if (!Number.isInteger(spId)) {
            throw new InvalidParamsError("Create availability");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create availability", "Missing data");
        }

        if (!(req.user.is_admin || req.user.is_survey)) {
            throw new InsufficientPermissionsError("Create availability");
        }

        const servicePointAvailability = req.body;

        try {
            const result = await insertServicePointAvailability(spId, servicePointAvailability);
            res.status(200).json({ id: parseInt(result[0], 10), state: "created" });
        }
        catch (err) {
            if (err instanceof ValidationError) {
                debug("Create availability error : Invalid data(422)");
                res.status(422).json({ error: err.data });
            }
        }
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});


module.exports = router;
