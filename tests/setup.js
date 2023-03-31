const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env.test')});

const request = require('supertest');
const app = require('../src/app');

const dbManagerConfig = require('./dbManagerConfig');
const dbManager = require('knex-db-manager').databaseManagerFactory(dbManagerConfig);

global.dbManager = dbManager;
// global.knex = dbManager.knexInstance();

// The knex instance, when fetched from the dbManager as above, seems to become unusable after performing one of the other dbManager operations (dropDb, etc.) and then needs to be
// re-fetched by calling knexInstance() again. The error that is thrown when it becomes unusable is: "Unable to acquire a connection".
// Apparently this error points to a problem with the client configuration, as detailed in the following SO question, however that seems unlikely in this case as a working instance
// is returned when knexInstance() is called again.
// https://stackoverflow.com/questions/41633344/knex-migration-postgres-heroku-error-unable-to-acquire-connection

// While we can work around this, and so make the tests use the same knex instance as the dbManager, we have no way to pass this instance into the individual route modules which
// all perform their own import of our knex wrapper module (/src/knex.js). [Yes, we could change that, but the current solution is actually simpler.]
// Therefore we are importing our knex wrapper module here so that we can handle the teardown of the connection pool (by calling knex.destroy()) and prevent Jest from hanging.

// In summary, the tests and the route modules share the knex instance that is imported here, while the dbManager maintains its own instance. Both are cleaned up in afterAll().
// 'dbManager' and 'knex' are set on the global context for reuse in test files.
const knex = require('../src/knex');
global.knex = knex;

global.testData = {}; // used to store seed data records, etc. from beforeEach() that are used by tests

beforeAll(async () => {
    try {
        await dbManager.dropDb();
        await dbManager.createDb();
        await dbManager.migrateDb();
    }
    catch (err) {
        // wrapping errors in JS is sucky
        // see discussion here: https://stackoverflow.com/questions/42754270/re-throwing-exception-in-nodejs-and-not-losing-stack-trace
        err.message = "Error in beforeAll. " + err.message;
        throw err;
    }
}, 30000);

let logUserInAndSetAuthToken = async function(email, password) {
    if (!password) {
        password = "testpassword";
    }

    let user = await knex('users').where('email', email).first();
    let loginResponse = await request(app).post('/api/v3/auth/login').send({
        "email": user.email,
        "password": password
    });
    user.authToken = loginResponse.body['token'];

    return user;
};

beforeEach(async () => {
    try {
        await dbManager.truncateDb(['knex_migrations', 'knex_migrations_lock']); // specified table names will NOT be truncated
        await dbManager.populateDb();
        await dbManager.updateIdSequences();

        // get the entities created via the populateDb call above (created from seed files) and set them on global.testData so that the tests can access them
        global.testData.defaultCountry = await knex('countries').where('name', 'Uganda').first();

        global.testData.defaultLocation = await knex('settlements').where('name', 'Nakivale Base Camp').first();

        global.testData.defaultServicePoint = await knex('service_points').where('name', 'Talking Stick').first();
        global.testData.defaultServiceType = await knex('service_types').where('name', 'Water').first();

        global.testData.adminUser = await logUserInAndSetAuthToken('adminuser@kujakuja.com');
        global.testData.surveyUser = await logUserInAndSetAuthToken('surveyuser@kujakuja.com');
        global.testData.nonPrivilegedUser = await logUserInAndSetAuthToken('nonprivuser@kujakuja.com');
        global.testData.serviceProviderUser = await logUserInAndSetAuthToken('serviceprovideruser@kujakuja.com');
    }
    catch (err) {
        err.message = "Error in beforeEach. " + err.message;
        throw err;
    }
}, 30000);

afterAll(async () => {
    try {
        await knex.destroy();
        await dbManager.closeKnex();
        await dbManager.dropDb();
        await dbManager.close();
    }
    catch (err) {
        err.message = "Error in afterAll. " + err.message;
        throw err;
    }
}, 30000);

