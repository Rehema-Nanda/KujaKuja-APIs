const debug = require("debug")("kk:settlements");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const { validate } = require("jsonschema");
const knex = require("../knex");

const schema = require("../models/settlements");

const {
    FRONTEND_LOGIN_REQUIRED,
} = process.env;

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /:id? => list all settlements or the one corresponding to the given id
router.get("/:id?", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get locations");
        }

        const results = knex("settlements").select(
            "settlements.*",
            "countries.name AS country_name",
        ).innerJoin("countries", "countries.id", "settlements.country_id");

        if (req.params.id) {
            if (req.params.id === "enabled") {
                results.where("countries.enabled", true);
            }
            else if (!Number.isInteger(parseInt(req.params.id, 10))) {
                throw new InvalidParamsError("Get locations");
            }
            else {
                const locationId = req.params.id;
                results.where("settlements.id", locationId);
            }
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
 * Description: Paginates locations
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Get paginated locations");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex("settlements").select(
            "settlements.*",
            "countries.name AS country_name",
        ).innerJoin("countries", "countries.id", "settlements.country_id")
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

// POST / => create a settlement
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create location", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Create location");
        }

        const settlement = req.body;
        // don't allow clients to set these:
        delete settlement.created_at;
        delete settlement.updated_at;

        const validationResult = validate(settlement, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create location", validationResult.errors);
        }

        debug("Valid object");
        knex("settlements").returning("id")
            .insert(settlement)
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

// PUT / => update a settlement
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update location");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update location", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update location");
        }

        const settlementId = req.params.id;
        const settlement = req.body;
        settlement.updated_at = moment().format();

        const validationResult = validate(settlement, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update location", validationResult.errors);
        }

        debug("Valid object");
        knex("settlements")
            .where("id", settlementId)
            .update(settlement)
            .returning("id")
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

// DELETE /:id => delete a settlement
router.delete("/:id", (req, res) => {
    try {
        const settlementId = parseInt(req.params.id, 10);
        debug(`Delete location => id: ${settlementId}`);

        if (!Number.isInteger(settlementId)) {
            throw new InvalidParamsError("Delete location");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete location");
        }

        knex("settlements")
            .where("id", settlementId)
            .del()
            .then((result) => {
                res.status(200).json(
                    {
                        id: result === 0 ? null : settlementId,
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
