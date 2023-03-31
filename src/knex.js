'use strict';

const Knex = require('knex');
const db_config = require('./config/db');

// Connect to the database
const knex = Knex(db_config);

module.exports = knex;
