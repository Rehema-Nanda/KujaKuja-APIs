const debug = require("debug")("kk:task_handlers:syndication_helpers");
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");
const { BigQuery } = require("@google-cloud/bigquery");

const logger = require("../../config/logging");

const sql = google.sql("v1beta4");
const storage = new Storage();
const bigquery = new BigQuery();

const {
    GOOGLE_CLOUD_PROJECT,
    GCP_LOCATION,
    SYND_ENV_TYPE,
    SYND_TARGET_ENV,
    SYND_SOURCE_ENV,
} = process.env;

const TARGET_CLOUD_STORAGE_BUCKET_NAME = `kujakuja-${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-syndication`;
const ofdaEnvs = "crc,adra,nrc,world-vision,aah,drc,cua";

/*
   Note that we use two different kinds of client library here:
   - the newer "@google-cloud/<product>" libraries are used to interface with Cloud Storage and BigQuery
     (see https://github.com/googleapis/google-cloud-node)
   - the more generic "googleapis" library is used to interface with Cloud SQL, for which a Google Cloud library does
     not exist at time of writing (09/2020)
     (see https://github.com/googleapis/google-api-nodejs-client)
 */

const googleapisAuthenticateForCloudSql = () => {
    // https://github.com/googleapis/google-api-nodejs-client#application-default-credentials
    // https://github.com/googleapis/google-api-nodejs-client#setting-global-or-service-level-auth
    // required scopes are listed here: https://cloud.google.com/sql/docs/postgres/admin-api#OAuth2Authorizing
    const auth = new google.auth.GoogleAuth({
        scopes: [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/sqlservice.admin",
        ],
    });
    auth.getClient().then(
        (authClient) => {
            google.options({
                auth: authClient,
            });
            logger.info(
                "Syndication Helpers: Successfully configured googleapis authentication for Cloud SQL Admin API",
            );
        },
        (error) => {
            debug(error);
            logger.error(
                error,
                "Syndication Helpers: Failed to configure googleapis authentication for Cloud SQL Admin API",
            );
        },
    );
};

const getTargetEnvCloudSqlInstanceDetails = async () => {
    let srcProjectId;

    if (SYND_SOURCE_ENV.includes("ofda") || ofdaEnvs.includes(SYND_TARGET_ENV)) {
        srcProjectId = `kujakuja-ofda-${SYND_ENV_TYPE}`;
    }
    else {
        srcProjectId = GOOGLE_CLOUD_PROJECT;
    }

    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/list
    const result = await sql.instances.list({
        project: srcProjectId,
    });

    // assumes there is at least one instance and that we care about the first one
    return {
        project: srcProjectId,
        instance: result.data.items[0].name,
        serviceAccountEmailAddress: result.data.items[0].serviceAccountEmailAddress,
    };
};

const getSourceEnvCloudSqlInstanceDetails = async (sourceEnv) => {
    let srcProjectId;

    if (SYND_TARGET_ENV === "ofda") {
        srcProjectId = `kujakuja-${SYND_TARGET_ENV}-${SYND_ENV_TYPE}`;
    }
    else {
        srcProjectId = `kujakuja-${sourceEnv}-${SYND_ENV_TYPE}`;
    }
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/list
    const result = await sql.instances.list({
        project: srcProjectId,
        auth: google.auth,
    });

    // assumes there is at least one instance and that we care about the first one
    return {
        project: srcProjectId,
        instance: result.data.items[0].name,
        serviceAccountEmailAddress: result.data.items[0].serviceAccountEmailAddress,
    };
};

const acquireTargetCloudStorageBucket = async () => {
    // https://googleapis.dev/nodejs/storage/latest/Bucket.html#get
    const response = await storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).get(
        {
            autoCreate: true,
            location: GCP_LOCATION,
            storageClass: "STANDARD",
        },
    );
    const [bucket, apiResponse] = response; // eslint-disable-line no-unused-vars
    logger.info(`Syndication Helpers: Cloud Storage bucket "${bucket.name}" acquired`);
};

const addUserToTargetCloudStorageBucketWriters = async (userEmailAddress) => {
    // Bucket.acl is not documented at https://googleapis.dev/nodejs/storage/latest/Bucket.html at time of writing.
    // You can piece it together from the samples: https://googleapis.dev/nodejs/storage/latest/#samples
    // and the JSON API docs: https://cloud.google.com/storage/docs/json_api/v1/bucketAccessControls

    logger.info(
        `Syndication Helpers: Checking if "${userEmailAddress}" has "WRITER" role in ACL for Cloud Storage bucket 
        "${TARGET_CLOUD_STORAGE_BUCKET_NAME}"`,
    );
    try {
        // https://github.com/googleapis/nodejs-storage/blob/master/samples/printBucketAclForUser.js
        const [aclObject] = await storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).acl.get({
            entity: `user-${userEmailAddress}`,
        });
        if (aclObject.role === "WRITER") {
            return;
        }
    }
    catch (error) {
        // API returns 404 if userEmailAddress is not in the ACL
        if (error.code !== 404) {
            throw error;
        }
    }

    logger.info(
        `Syndication Helpers: Adding "${userEmailAddress}" to ACL for Cloud Storage bucket 
        "${TARGET_CLOUD_STORAGE_BUCKET_NAME}" with role "WRITER"`,
    );
    // https://github.com/googleapis/nodejs-storage/blob/master/samples/addBucketOwnerAcl.js
    await storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).acl.writers.addUser(userEmailAddress);
};

const addUserToTargetCloudStorageFileReaders = async (userEmailAddress, filename) => {
    // https://googleapis.dev/nodejs/storage/latest/Bucket.html
    // https://googleapis.dev/nodejs/storage/latest/Bucket.html#file
    // File.acl is not documented at https://googleapis.dev/nodejs/storage/latest/File.html at time of writing.
    // You can piece it together from https://googleapis.dev/nodejs/storage/latest/#samples
    // and the JSON API docs: https://cloud.google.com/storage/docs/json_api/v1/objectAccessControls

    logger.info(
        `Syndication Helpers: Checking if "${userEmailAddress}" has "READER" role in ACL for Cloud Storage file 
        "gs://${TARGET_CLOUD_STORAGE_BUCKET_NAME}/${filename}"`,
    );
    try {
        // https://github.com/googleapis/nodejs-storage/blob/master/samples/printFileAclForUser.js
        const [aclObject] = await storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).file(filename).acl.get({
            entity: `user-${userEmailAddress}`,
        });
        if (aclObject.role === "READER") {
            return;
        }
    }
    catch (error) {
        // API returns 404 if userEmailAddress is not in the ACL
        if (error.code !== 404) {
            throw error;
        }
    }

    logger.info(
        `Syndication Helpers: Adding "${userEmailAddress}" to ACL for Cloud Storage file 
        "gs://${TARGET_CLOUD_STORAGE_BUCKET_NAME}/${filename}" with role "READER"`,
    );
    // https://github.com/googleapis/nodejs-storage/blob/master/samples/addFileOwnerAcl.js
    await storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).file(filename).acl.readers.addUser(userEmailAddress);
};

const getSourceDatabaseName = async (sourceEnv) => {
    let dbName;

    if (sourceEnv === "ofda") {
        dbName = "kujakuja";
    }
    else if (SYND_TARGET_ENV === "ofda" && ofdaEnvs.includes(sourceEnv)) {
        dbName = `${sourceEnv}-db`;
    }
    else {
        dbName = "kujakuja";
    }

    return dbName;
};

const getSourceEnvCloudSqlExportParams = async (exportFile, table, query, sourceEnv) => {
    const dbName = await getSourceDatabaseName(sourceEnv);
    logger.info(`Syndication export: Exporting data from database: ${dbName}...`);
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/export
    return {
        uri: `gs://${TARGET_CLOUD_STORAGE_BUCKET_NAME}/${sourceEnv}-${SYND_ENV_TYPE}-${exportFile}`,
        databases: [
            dbName,
        ],
        kind: "sql#exportContext",
        sqlExportOptions: {
            tables: [
                table,
            ],
            schemaOnly: false,
        },
        csvExportOptions: {
            selectQuery: query,
        },
        fileType: "CSV",
    };
};

const getTargetDatabaseName = async () => {
    let dbName;

    if (SYND_TARGET_ENV === "ofda") {
        dbName = "kujakuja";
    }
    else if (SYND_SOURCE_ENV.includes("ofda") || ofdaEnvs.includes(SYND_TARGET_ENV)) {
        dbName = `${SYND_TARGET_ENV}-db`;
    }
    else {
        dbName = "kujakuja";
    }

    return dbName;
};

const getTargetEnvCloudSqlImportParams = async (importFile, table, sourceEnv) => {
    const dbName = await getTargetDatabaseName();
    logger.info(`Syndication import: Importing data into database: ${dbName}...`);

    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/import
    return {
        uri: `gs://${TARGET_CLOUD_STORAGE_BUCKET_NAME}/${sourceEnv}-${SYND_ENV_TYPE}-${importFile}`,
        database: dbName,
        kind: "sql#importContext",
        fileType: "CSV",
        csvImportOptions: {
            table: `"${sourceEnv}".${table}`,
        },
    };
};

const isMostRecentCloudSqlOperationDone = async (project, instance) => {
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/operations/list
    const response = await sql.operations.list({
        project,
        instance,
    });

    if (response.data.items.length === 0) {
        return true;
    }

    const operationStatus = response.data.items[0].status;
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/operations#SqlOperationStatus
    return operationStatus === "DONE";
};

const startCloudSqlExportOperation = async (project, instance, exportParams) => {
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/export
    await sql.instances.export({
        project: project,
        instance: instance,
        requestBody: { exportContext: exportParams },
    });
};

const startCloudSqlImportOperation = async (project, instance, importParams) => {
    // https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/import
    await sql.instances.import({
        project: project,
        instance: instance,
        requestBody: { importContext: importParams },
    });
};

const acquireTargetBigQueryDataset = async (datasetId) => {
    // https://googleapis.dev/nodejs/bigquery/latest/BigQuery.html#getDatasets
    const [datasets] = await bigquery.getDatasets();
    const datasetExists = datasets.find((dataset) => {
        return dataset.id === datasetId;
    });
    if (!datasetExists) {
        // https://googleapis.dev/nodejs/bigquery/latest/BigQuery.html#createDataset
        const [dataset] = await bigquery.createDataset(datasetId);
        logger.info(`Syndication Helpers: Dataset "${dataset.id}" created`);
    }
};

const acquireTargetBigQueryTable = async (datasetId, tableId, tableSchema) => {
    // https://googleapis.dev/nodejs/bigquery/latest/BigQuery.html#dataset
    // https://googleapis.dev/nodejs/bigquery/latest/Dataset.html#getTables
    const [allTables] = await bigquery.dataset(datasetId).getTables();
    const tableExists = allTables.find((table) => {
        return table.id === tableId;
    });
    if (!tableExists) {
        const options = {
            location: "US",
            schema: tableSchema,
        };
        // https://googleapis.dev/nodejs/bigquery/latest/Dataset.html#createTable
        const [table] = await bigquery.dataset(datasetId).createTable(tableId, options);
        logger.info(`Syndication Helpers: Table "${table.id}" created`);
        return table.metadata.tableReference;
    }
    return tableExists.metadata.tableReference;
};

const createBigQueryLoadJob = async (datasetId, tableId, tableReference, tableSchema, filename) => {
    // https://googleapis.dev/nodejs/bigquery/latest/Dataset.html#table
    // https://googleapis.dev/nodejs/bigquery/latest/Table.html#load
    // https://googleapis.dev/nodejs/storage/latest/Bucket.html#file
    const options = {
        sourceFormat: "CSV",
        skipLeadingRows: 1,
        schema: {
            fields: tableSchema,
        },
        destinationTable: tableReference,
        location: "US",
        writeDisposition: "WRITE_TRUNCATE",
    };
    const [job] = await bigquery
        .dataset(datasetId)
        .table(tableId)
        .load(storage.bucket(TARGET_CLOUD_STORAGE_BUCKET_NAME).file(filename), options);

    logger.info(`Syndication Helpers: Load job "${job.id}" created`);
};

const init = () => {
    googleapisAuthenticateForCloudSql();
};
init();

module.exports = {
    TARGET_CLOUD_STORAGE_BUCKET_NAME,
    getTargetEnvCloudSqlInstanceDetails,
    getSourceEnvCloudSqlInstanceDetails,
    acquireTargetCloudStorageBucket,
    addUserToTargetCloudStorageBucketWriters,
    addUserToTargetCloudStorageFileReaders,
    getSourceEnvCloudSqlExportParams,
    getTargetEnvCloudSqlImportParams,
    isMostRecentCloudSqlOperationDone,
    startCloudSqlExportOperation,
    startCloudSqlImportOperation,
    acquireTargetBigQueryDataset,
    acquireTargetBigQueryTable,
    createBigQueryLoadJob,
    getTargetDatabaseName,
};
