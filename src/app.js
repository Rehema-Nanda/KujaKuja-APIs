"use strict";

const debug = require("debug")("kk:app");

// Load .env (if *not* in production)
// NB: It would be nicer to have this in server.js,
// but Jest calls listen directly on the app when running tests, so we need it here
if (process.env.NODE_ENV !== "production") {
    debug("Loading .env");
    require("dotenv").config();
}

const { Model } = require("objection");
const lb = require("@google-cloud/logging-bunyan");
const express = require("express");
const bodyParser = require("body-parser");

const passport = require("passport");
require("./config/passport");

const knex = require("./knex");

Model.knex(knex);

const index = require("./routes/index");
const auth = require("./routes/auth");
const countries = require("./routes/countries");
const locations = require("./routes/locations");
const service_points = require("./routes/service_points");
const service_types = require("./routes/service_types");
const aggregate = require("./routes/aggregate");
const search = require("./routes/search");
const themes = require("./routes/themes");
const app_config = require("./routes/app_config");
const responses = require("./routes/responses");
const anonymousResponses = require("./routes/responses_anon");
const users = require("./routes/users");
const snapshots = require("./routes/snapshots");
const featured_ideas = require("./routes/featured_ideas");
const config = require("./routes/config");
const tags = require("./routes/tags");
const action_feeds = require("./routes/action_feeds");

const tasks_email = require("./routes/task_handlers/email");
const tasks_nlp = require("./routes/task_handlers/nlp");
const tasks_data_aggregation = require("./routes/task_handlers/data_aggregation");
const tasks_syndication = require("./routes/task_handlers/syndication");
const tasks_syndication_schemas_and_migration = require("./routes/task_handlers/syndication_schemas_and_migration");
const tasks_slack = require("./routes/task_handlers/slack");
const tasks_tag = require("./routes/task_handlers/tag");

const app = express();
async function startServer() {
    const { mw } = await lb.express.middleware();
    app.use(mw); // this allows for request bundling in StackDriver

    app.enable("trust proxy");
    app.use(bodyParser.raw());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    // Initialize passport
    app.use(passport.initialize());

    // Allow CORS for *
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization, content-type, Access-Control-Allow-Headers, X-Requested-With");
        res.header("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,DELETE,PATCH");
        if (req.method === "OPTIONS") {
            debug("Set OPTIONS CORS headers");
            res.status(200)
                .send("");
        }
        else {
            // res.header('Access-Control-Allow-Origin', '*');
            // res.header('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length');
            debug("Set overall CORS headers");
            next();
        }
    });

    app.use("/", index);

    app.use("/api/v3/auth", passport.authenticate(["local", "jwt"], { session: false }), auth);
    app.use("/api/v3/countries", passport.authenticate("jwt", { session: false }), countries);
    app.use("/api/v3/locations", passport.authenticate("jwt", { session: false }), locations);
    app.use("/api/v3/service_points", passport.authenticate("jwt", { session: false }), service_points);
    app.use("/api/v3/service_types", passport.authenticate("jwt", { session: false }), service_types);
    app.use("/api/v3/aggregate", passport.authenticate("jwt", { session: false }), aggregate);
    app.use("/api/v3/search", passport.authenticate("jwt", { session: false }), search);
    app.use("/api/v3/themes", passport.authenticate("jwt", { session: false }), themes);
    app.use("/api/v3/app_config", passport.authenticate("jwt", { session: false }), app_config);
    app.use("/api/v3/responses", passport.authenticate("jwt", { session: false }), responses.router);
    app.use("/api/v3/users", passport.authenticate("jwt", { session: false }), users);
    app.use("/api/v3/snapshots", passport.authenticate("jwt", { session: false }), snapshots);
    app.use("/api/v3/featured_ideas", passport.authenticate("jwt", { session: false }), featured_ideas);
    app.use("/api/v3/config", passport.authenticate("jwt", { session: false }), config);
    app.use("/api/v3/tags", passport.authenticate("jwt", { session: false }), tags);
    app.use("/api/v3/action_feeds", passport.authenticate("jwt", { session: false }), action_feeds);
    app.use("/api/v3/responses_anon", anonymousResponses);

    app.use("/tasks/email", tasks_email);
    app.use("/tasks/nlp", tasks_nlp);
    app.use("/tasks/data_aggregation", tasks_data_aggregation);
    app.use("/tasks/syndication", tasks_syndication);
    app.use("/tasks/syndication/schemas_and_migration", tasks_syndication_schemas_and_migration);
    app.use("/tasks/slack", tasks_slack);
    app.use("/tasks/tag", tasks_tag);

    // error handler
    app.use((err, req, res) => {
        // log error and return
        res.status(err.status || 500);
        res.send(err);
        req.log.info(err);
    });
}

startServer();

module.exports = app;
