
const debug = require("debug")("kk:users");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const { validate } = require("jsonschema");
const schema = require("../models/users");
const knex = require("../knex");

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /:id? => all or the one corresponding to id
router.get("/:id?", (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
            throw new InsufficientPermissionsError("Get users");
        }

        const results = knex.select("users.*", "settlements.name AS settlement_name")
            .from("users")
            .innerJoin("settlements", "settlements.id", "users.settlement_id");

        if (req.params.id) {
            const { id } = req.params;
            debug(`Get user => id: ${id}`);
            results.where("users.id", id);
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
 * Description: Paginates users
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
            throw new InsufficientPermissionsError("Get paginated users");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex.select("users.*", "settlements.name AS settlement_name")
            .from("users")
            .innerJoin("settlements", "settlements.id", "users.settlement_id")
            .where("users.id", "<", 1000000000);

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

// POST / => create user
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create user", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Get users");
        }

        const user = req.body;
        user.uid = user.email;
        // don't allow clients to set these:
        delete user.created_at;
        delete user.updated_at;

        const validationResult = validate(user, schema.post);

        if (!validationResult.valid) {
            debug("Create user error : Invalid data(422)");
            res.status(422).json({ error: validationResult.errors });
            return;
        }

        debug("Valid object");

        knex("users")
            .returning("id")
            .insert(user)
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

// PUT /:id => update user with id
router.put("/:id", (req, res) => {
    try {
        if (!req.params.id) {
            throw new InvalidParamsError("Update user");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update user");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update user");
        }

        const { id } = req.params;
        const user = req.body;
        user.updated_at = moment().format();
        // don't allow clients to set these:
        delete user.created_at;
        delete user.uid;

        const validationResult = validate(user, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update user", validationResult.errors);
        }

        debug("Valid object");
        knex("users")
            .where("id", id)
            .update(user)
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

// DELETE /:id => delete user with id
router.delete("/:id", (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!Number.isInteger(userId)) {
            throw new InvalidParamsError("Delete user");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete user");
        }

        const { id } = req.params;
        debug(`Delete user => id: ${id}`);

        knex("users")
            .where("id", id)
            .del()
            .then(() => {
                res.status(200).json({
                    id: parseInt(id, 10),
                    state: "deleted",
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

module.exports = router;
