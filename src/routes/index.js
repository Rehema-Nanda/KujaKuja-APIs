const express = require("express");

const router = express.Router();
const knex = require("../knex");

// GET
router.get("/", (req, res) => {
    const results = knex("public.responses")
        .count("*")
        .then((result) => {
            return result;
        });
    results.then((response) => {
        res.status(200).json(
            {
                message: "Hello, world!",
                response_count: response[0].count,
                headers: req.headers,
            },
        ).end();
    });
});

module.exports = router;
