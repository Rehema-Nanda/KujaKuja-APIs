const debug = require("debug")("kk:featured_ideas");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const { validate } = require("jsonschema");
const knex = require("../knex");

const schema = require("../models/featured_ideas");

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /last
// Description: Get last 7 days featured ideas
router.get("/last", (req, res) => {
    try {
        debug("Get last 7 days featured ideas");

        const start = moment.utc().subtract(7, "days").startOf("day");
        const end = moment.utc().add(1, "days").startOf("day"); // include featured ideas created today

        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
            throw new InsufficientPermissionsError("Get featured ideas");
        }

        const results = knex.select("featured_ideas.id", "featured_ideas.idea", "featured_ideas.created_at", "featured_ideas.updated_at", "settlements.name")
            .from("featured_ideas")
            .innerJoin("settlements", "settlements.id", "featured_ideas.settlement_id")
            .where("featured_ideas.created_at", ">=", start.format())
            .andWhere("featured_ideas.created_at", "<", end.format())
            .orderBy("featured_ideas.created_at", "desc");

        results.then((response) => {
            res.status(200).json(response).end();
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

// GET /:id?
// Description: Get all featured ideas or the one corresponding to id.
// @@ URL params @@
// id (integer) : optional => id of the featured idea
router.get("/:id?", (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
            throw new InsufficientPermissionsError("Get featured ideas");
        }

        const results = knex.select("featured_ideas.*", "settlements.name AS settlement_name")
            .from("featured_ideas")
            .innerJoin("settlements", "settlements.id", "featured_ideas.settlement_id")
            .orderBy("featured_ideas.created_at", "desc");

        if (req.params.id) {
            if (!Number.isInteger(parseInt(req.params.id, 10))) {
                throw new InvalidParamsError("Get featured ideas");
            }

            const featuredIdeaId = req.params.id;
            results.where("featured_ideas.id", featuredIdeaId);
        }
        results.then((response) => {
            res.status(200).json(
                {
                    count: response.length,
                    data: response,
                },
            ).end();
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
 * Description: Paginates featured ideas
 *
 * @param {Number} limit: optional => pagination, number of records to return
 * @param {Number} page: optional => pagination, the page number to return
 * @param {Object} sort: {'by': '<field_name>', 'order': '<asc|desc>'}) : optional => define a single-field ordering
 */
router.post("/paginator", (req, res) => {
    try {
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider)) {
            throw new InsufficientPermissionsError("Get paginated featured ideas");
        }

        const resp = {
            count: 0,
            data: {},
        };

        const results = knex.select("featured_ideas.*", "settlements.name AS settlement_name")
            .from("featured_ideas")
            .innerJoin("settlements", "settlements.id", "featured_ideas.settlement_id")
            .where("featured_ideas.id", "<", 1000000000)
            .andWhere("settlements.id", "<", 1000000000)
            .orderBy("featured_ideas.created_at", "desc");

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

// POST /
// Description: Create a featured idea
// @@ POST params @@
// idea (string) : required => text of the featured idea
// location_id (integer) : required => associated location of the featured idea
router.post("/", (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Create featured idea", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Create featured idea");
        }

        const featuredIdea = req.body;
        // don't allow clients to set these:
        delete featuredIdea.created_at;
        delete featuredIdea.updated_at;

        const validationResult = validate(featuredIdea, schema.post);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Create featured idea", validationResult.errors);
        }

        debug("Valid object");
        knex("featured_ideas")
            .returning("id")
            .insert(featuredIdea)
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

// PUT /:id
// Description: Update featured idea
// @@ URL params @@
// id (integer) : required => id of featured idea to update
// @@ POST params @@
// idea (string) : optional => text of the featured idea
// location_id (integer) : optional => associated location of the featured idea
router.put("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Update featured idea");
        }

        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update featured idea");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update featured idea");
        }

        const featuredIdeaId = req.params.id;
        const featuredIdea = req.body;
        featuredIdea.updated_at = moment().format();

        const validationResult = validate(featuredIdea, schema.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update featured idea", validationResult.errors);
        }

        debug("Valid object");
        knex("featured_ideas")
            .where("id", featuredIdeaId)
            .update(featuredIdea)
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

// DELETE /:id
// Description: Delete a featured idea.
// @@ URL params @@
// id (integer) : required => id of featured idea to delete
// @@ POST params @@
router.delete("/:id", (req, res) => {
    try {
        const featuredIdeaId = parseInt(req.params.id, 10);
        debug(`Delete featured idea => id: ${featuredIdeaId}`);

        if (!Number.isInteger(featuredIdeaId)) {
            throw new InvalidParamsError("Delete featured idea");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Delete featured idea");
        }

        knex("featured_ideas")
            .where("id", featuredIdeaId)
            .del()
            .then((result) => {
                res.status(200).json(
                    {
                        id: result === 0 ? null : featuredIdeaId,
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
