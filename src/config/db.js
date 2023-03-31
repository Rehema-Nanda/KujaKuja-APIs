'use strict';

const debug = require('debug')('kk:db_config');

const path = require('path');

// Load .env (if *not* in production)
// NB: The .env file is also loaded in app.js - we need it here for knex migrations to work when run directly from the command line, passing this file in as the knexfile
// eg: knex migrate:latest --knexfile ./src/config/db.js
if (process.env.NODE_ENV !== 'production') {
    debug('Loading .env (db.js)');
    require('dotenv').config({path: path.join(__dirname, '../../.env')});
}

let HOST = process.env.SQL_HOST || '127.0.0.1';
let PORT = process.env.SQL_PORT || 5432;
let SSL = process.env.SQL_SSL || false;


// If an 'INSTANCE_CONNECTION_NAME' environment variable exists and we're in production, then we're connecting to a Google Cloud SQL instance and we need to overwrite the HOST
// value. Note that this only applies to App Engine - Kubernetes Engine deployments use their own Cloud SQL Proxy container (see deployment manifest) and will connect to localhost.
// NB: Only set 'INSTANCE_CONNECTION_NAME' for App Engine deployments (app.yaml) that are connecting to a Cloud SQL instance!
if (process.env.INSTANCE_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
    HOST = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
}

const db_config = {
    client: 'pg',
    connection: {
        host: HOST,
        port: PORT,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        searchPath: ['knex', 'public'],
        ssl: process.env.SQL_SSL === 'true'
    },
    migrations: {
        directory: path.join(__dirname, '../../db/migrations')
    },
    seeds: {
        directory: path.join(__dirname, '/../../db/seeds')
    }
};

module.exports = db_config;
