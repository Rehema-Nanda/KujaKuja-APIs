const debug = require('debug')('kk:countries');

const express = require('express');
const router = express.Router();

const knex = require('../knex');

const _ = require('lodash');
const moment = require('moment');
const validate = require('jsonschema').validate;

const schema = require('../models/countries');

const {
    FRONTEND_LOGIN_REQUIRED,
} = process.env;

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /:id? => all or the one corresponding to id
router.get("/:id?", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get country");
        }

        const results = knex("countries").select();
        if (req.params.id) {
            if (req.params.id === "enabled") {
                results.where("enabled", true);
            }
            else if (!Number.isInteger(parseInt(req.params.id, 10))) {
                throw new InvalidParamsError("Get countries");
            }
            else {
                const countryId = req.params.id;
                results.where("id", countryId);
            }
        }
        results.then((response) => {
            res.status(200).json(
                {
                    count: response.length,
                    data: response,
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
 * Description: Paginates countries
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get paginated countries");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex("countries").select();
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

// POST / => create country
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create country", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Create country");
        }

        const country = req.body;
        // don't allow clients to set these:
        delete country.created_at;
        delete country.updated_at;

        const validationResult = validate(country, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create country", validationResult.errors);
        }

        debug("Valid object");
        knex("countries")
            .returning("id")
            .insert(country)
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

// PUT /:id => update country with id
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update country");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update country", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update country");
        }

        const countryId = req.params.id;
        const country = req.body;
        country.updated_at = moment().format();

        const validationResult = validate(country, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update country");
        }

        debug("Valid object");
        knex("countries")
            .where("id", countryId)
            .update(country).returning("id")
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

// DELETE /:id => delete country with id
router.delete("/:id", (req, res) => {
    try {
        const countryId = parseInt(req.params.id, 10);
        debug(`Delete country => id: ${countryId}`);

        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Delete country");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete country");
        }

        knex("countries")
            .where("id", countryId)
            .del()
            .then((result) => {
                res.status(200).json(
                    {
                        id: result === 0 ? null : countryId,
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

module.exports = router;
