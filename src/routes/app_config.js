const debug = require("debug")("kk:app_config");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const hash = require("object-hash");
const knex = require("../knex");

const getConfig = async () => {
    const results = await knex("countries")
        .innerJoin("settlements", "countries.id", "settlements.country_id")
        .innerJoin("service_points", "settlements.id", "service_points.settlement_id")
        .innerJoin("service_types", "service_points.service_type_id", "service_types.id")
        .select(
            "countries.id AS country_id", "countries.name AS country_name", "countries.enabled",
            "settlements.id AS settlement_id", "settlements.name AS settlement_name",
            "service_points.id", "service_points.name", "service_types.name AS service_type_name",
        )
        .where("countries.enabled", true)
        .orderBy("countries.name")
        .orderBy("settlements.name")
        .orderBy("service_points.name");

    /*
    using Map to preserve order,
    but Map values are objects because it's more difficult than it should be to turn a Map into JSON
    */
    const countries = new Map();

    _.forEach(results, (row) => {
        const countryId = parseInt(row.country_id, 10);
        const settlementId = parseInt(row.settlement_id, 10);
        const servicePointId = parseInt(row.id, 10);

        if (!countries.has(countryId)) {
            countries.set(
                countryId,
                {
                    id: countryId,
                    name: row.country_name,
                    settlements: new Map(),
                },
            );
        }

        if (!countries.get(countryId).settlements.has(settlementId)) {
            countries.get(countryId).settlements.set(
                settlementId,
                {
                    id: settlementId,
                    name: row.settlement_name,
                    service_points: new Map(),
                },
            );
        }

        if (!countries.get(countryId).settlements.get(settlementId).service_points.has(servicePointId)) {
            countries.get(countryId).settlements.get(settlementId).service_points.set(
                servicePointId,
                {
                    id: servicePointId,
                    name: row.name,
                    service_type_name: row.service_type_name,
                },
            );
        }
    });

    const retVal = {
        countries: Array.from(countries.values()),
    };

    _.forEach(retVal.countries, (country) => {
        // eslint-disable-next-line no-param-reassign
        country.settlements = Array.from(country.settlements.values());
        _.forEach(country.settlements, (settlement) => {
            // eslint-disable-next-line no-param-reassign
            settlement.service_points = Array.from(settlement.service_points.values());
        });
    });

    return retVal;
};

// GET /
// Description: Get the latest application configuration JSON object
router.get("/", async (req, res) => {
    try {
        const response = await getConfig();
        res.status(200).json(response);
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

// GET /hash
// Description: Get the hash of the latest application configuration JSON object
router.get("/hash", async (req, res) => {
    try {
        const config = await getConfig();
        const configHash = hash(config);
        res.status(200).send(configHash);
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

module.exports = router;
