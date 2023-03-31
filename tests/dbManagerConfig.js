const db_config = require('../src/config/db');
const path = require('path');

// do some extra safety checks as knex-db-manager is used to drop, create, migrate, truncate and seed the DB for testing
if (process.env.NODE_ENV === 'production' || db_config.connection.host.endsWith('amazonaws.com')) {
    throw new Error('Aborting dbManagerConfig construction - it looks like we\'re running in production!!!');
}

let dbManagerConfig = {
    knex: {},
    dbManager: {
        superUser: db_config.connection.user,
        superPassword: db_config.connection.password,
        populatePathPattern: path.join(db_config.seeds.directory, 'test/*')
    }
};
Object.assign(dbManagerConfig.knex, db_config); // merge the two configs

module.exports = dbManagerConfig;
