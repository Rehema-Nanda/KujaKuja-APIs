const express = require("express");

const debug = require("debug")("kk:initdata");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const knex = require("../knex");

const {
    InvalidParamsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /:id
// Description: Get initialization data for a particular country.
// @@ URL params @@
// id (integer) : required => country ID
router.get("/:id", (req, res) => {
    try {
        if (!Number.isInteger(parseInt(req.params.id, 10))) {
            throw new InvalidParamsError("Get initial data");
        }

        const countryId = req.params.id;

        const start1 = moment.utc().subtract(7, "days").startOf("day");
        const end = moment.utc().startOf("day");
        const start2 = moment.utc().subtract(14, "days").startOf("day");

        const resp = {
            dates: {
                start1: start1.format(),
                start2: start2.format(),
                end: end.format(),
            },
            id: countryId,
            satisfiedWeek1: 0,
            satisfiedWeek2: 0,
            totalWeek1: 0,
            totalWeek2: 0,
            pourcentWeek1: 0,
            pourcentWeek2: 0,
            delta: 0,
        };

        const servicePointIdsQuery = knex.select("service_points.id")
            .from("service_points")
            .leftJoin("settlements", "settlements.id", "service_points.settlement_id")
            .leftJoin("countries", "countries.id", "settlements.country_id")
            .where("countries.id", countryId);

        const resultCountWeek1 = knex("responses")
            .select("responses.satisfied")
            .count("responses.satisfied as cnt")
            .where("responses.service_point_id", "in", servicePointIdsQuery)
            .andWhere("responses.created_at", ">=", start1.format())
            .andWhere("responses.created_at", "<", end.format())
            .groupBy("responses.satisfied");

        const resultCountWeek2 = knex("responses")
            .select("responses.satisfied")
            .count("responses.satisfied as cnt")
            .where("responses.service_point_id", "in", servicePointIdsQuery)
            .andWhere("responses.created_at", ">=", start2.format())
            .andWhere("responses.created_at", "<", start1.format())
            .groupBy("responses.satisfied");

        /*
        TODO: factor out a function to do the satisfied,
        total and percentage calculations for a result set (also see aggregate route)
        */
        resultCountWeek1.then((results) => {
            let total = 0;
            let satisfied = 0;

            _.forEach(results, (row) => {
                total += parseInt(row.cnt, 10);
                if (row.satisfied) {
                    satisfied = parseInt(row.cnt, 10);
                }
            });

            resp.satisfiedWeek1 = satisfied;
            resp.totalWeek1 = total;
            const pourcentWeek1 = (satisfied / total) * 100;
            if (!Number.isNaN(pourcentWeek1)) {
                resp.pourcentWeek1 = pourcentWeek1;
            }
            resultCountWeek2.then((result) => {
                let totalSecondWeek = 0;
                let satisfiedSecondWeek = 0;

                _.forEach(result, (row) => {
                    totalSecondWeek += parseInt(row.cnt, 10);
                    if (row.satisfied) {
                        satisfiedSecondWeek = parseInt(row.cnt, 10);
                    }
                });

                resp.satisfiedWeek2 = satisfiedSecondWeek;
                resp.totalWeek2 = totalSecondWeek;
                const pourcentWeek2 = (satisfiedSecondWeek / totalSecondWeek) * 100;
                if (!Number.isNaN(pourcentWeek2)) {
                    resp.pourcentWeek2 = pourcentWeek2;
                }
                let delta = 0;
                if (resp.pourcentWeek2 !== 0) {
                    delta = ((resp.pourcentWeek1 - resp.pourcentWeek2) / resp.pourcentWeek2) * 100;
                }
                else {
                    delta = (resp.pourcentWeek1 - resp.pourcentWeek2);
                }
                if (!Number.isNaN(delta)) {
                    resp.delta = delta;
                }
                res.status(200).json(resp);
            }).catch((err) => {
                debug(err);
                req.log.error(err);
                res.status(500).end();
            });
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
