const debug = require("debug")("kk:service_types");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const { validate } = require("jsonschema");
const knex = require("../knex");
const schema = require("../models/service_types");

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
            throw new InsufficientPermissionsError("Get service types");
        }
        let results;
        if (req.params.id) {
            if (!Number.isInteger(parseInt(req.params.id, 10))) {
                throw new InvalidParamsError("Get service types", "Malformed id");
            }

            const stId = req.params.id;
            debug(`Get service types => id: ${stId}`);

            results = knex("service_types")
                .select()
                .where("id", stId);
        }
        else {
            debug("Get service types");
            results = knex("service_types")
                .select();
        }

        results.then((response) => {
            res.status(200).json(
                {
                    count: response.length,
                    data: response,
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

/**
 * POST /paginator
 * Description: Paginates service types
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get paginated service types");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex("service_types").select();
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

// POST / => create service_type
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create service type", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Create service type");
        }

        // eslint-disable-next-line camelcase
        const service_type = req.body;
        // don't allow clients to set these:
        delete service_type.created_at;
        delete service_type.updated_at;

        const validationResult = validate(service_type, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create service type", validationResult.errors);
        }

        debug("Valid object");
        knex("service_types")
            .returning("id")
            .insert(service_type)
            .then((result) => {
                res.status(200).json({
                    id: parseInt(result[0], 10),
                    state: "created",
                });
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

// PUT /:id => update service_type with id
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update service type");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update service type", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update service type");
        }
        const stId = req.params.id;
        // eslint-disable-next-line camelcase
        const service_type = req.body;
        delete service_type.created_at; // don't allow clients to set this
        service_type.updated_at = moment().format();

        const validationResult = validate(service_type, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update service type error", validationResult.errors);
        }

        debug("Valid object");
        knex("service_types")
            .where("id", stId)
            .update(service_type)
            .then((result) => {
                res.status(200).json({
                    id: parseInt(result, 10),
                    state: "updated",
                });
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

// DELETE /:id => delete service_type with id
router.delete("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Delete service type");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete service type");
        }

        const stId = req.params.id;
        debug(`Delete service_type => id: ${stId}`);

        knex("service_types")
            .where("id", stId)
            .del()
            .then(() => {
                res.status(200).json({ id: stId, state: "deleted" });
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
