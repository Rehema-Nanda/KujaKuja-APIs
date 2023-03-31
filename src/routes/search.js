const debug = require("debug")("kk:search");
const express = require("express");

const router = express.Router();

const knex = require("../knex");

const { FRONTEND_LOGIN_REQUIRED } = process.env;
const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");


// GET /search/:pattern
// Description: Search for 'pattern' in DB => countries.name (enabled = true),
// settlements.name and service_points.name
// @@ URL params @@
// pattern (string) : required => pattern to look for
// @@ POST params @@
router.get("/:pattern", (req, res) => {
    try {
        // if login required on front-end, ensure user has role attached
        if (!(req.user.is_admin || req.user.is_survey || req.user.is_service_provider) && FRONTEND_LOGIN_REQUIRED.toLowerCase() === "true") {
            throw new InsufficientPermissionsError("Search error");
        }

        if (!req.params.pattern) {
            throw new InvalidParamsError("Search error", "Missing pattern");
        }

        if (!req.params.pattern.match(/^[0-9a-z]+$/i)) {
            throw new InvalidParamsError("Search error", "Forbidden character(s)");
        }

        const { pattern } = req.params;
        debug(`Search for: ${pattern}`);

        const resp = {
            countries: [],
            settlements: [],
            service_points: [],
        };

        const countries = knex("countries")
            .select()
            .where("enabled", true)
            .andWhere("name", "ilike", `%${pattern}%`);

        const settlements = knex("settlements")
            .select()
            .where("name", "ilike", `%${pattern}%`);

        // eslint-disable-next-line camelcase
        const service_points = knex("service_points")
            .select()
            .where("name", "ilike", `%${pattern}%`);

        // eslint-disable-next-line camelcase
        Promise.all([countries, settlements, service_points]).then((results) => {
            // eslint-disable-next-line prefer-destructuring
            resp.countries = results[0];
            // eslint-disable-next-line prefer-destructuring
            resp.settlements = results[1];
            // eslint-disable-next-line prefer-destructuring
            resp.service_points = results[2];
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

module.exports = router;
