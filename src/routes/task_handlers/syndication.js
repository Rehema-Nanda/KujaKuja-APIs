const debug = require("debug")("kk:task_handlers:syndication");
const express = require("express");

const { syndicationCloudTaskRunner, CloudTaskNames } = require("./cloud_tasks_runner");
const { tables } = require("./syndication_tables");
const {
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
} = require("./syndication_helpers");
const {
    getExportQueryForBigQuery,
    getTableSchemaForBigQuery,
} = require("./syndication_bq_export_queries_and_schemas");

const router = express.Router();

const {
    SYND_ENV_TYPE,
    SYND_TARGET_ENV,
    SYND_SOURCE_ENV,
} = process.env;

const ALL_SOURCE_ENVIRONMENTS = SYND_SOURCE_ENV.split(",");
const ALLOWED_TABLE_NAMES = tables.map((table) => {
    return table.name;
});

/*
   For the most part, the syndication process runs on the *target* environment/project:
   - tasks run there
   - files are written to Cloud Storage there
   - CSVs are loaded into the BigQuery dataset there

   The Cloud SQL operations that perform the exports from the *source* environments run within those environments, but
   write their outputs to a Cloud Storage bucket in the target environment.
 */
router.get("/", async (req, res) => {
    try {
        await syndicationCloudTaskRunner.initiate();
        // initiate the state machine for processing the syndication tasks in a synchronous fashion
        await acquireTargetCloudStorageBucket();
        // Give bucket write permissions to the target environment's Cloud SQL instance service account (for BigQuery
        // exports)
        const { serviceAccountEmailAddress } = await getTargetEnvCloudSqlInstanceDetails();
        await addUserToTargetCloudStorageBucketWriters(serviceAccountEmailAddress);

        const firstSourceEnvironment = ALL_SOURCE_ENVIRONMENTS[0];
        // Check if there are any source environments and go straight to BiqQuery export step if not
        // The check for "None" is here because Python will return "None" from app.yaml if SYND_SOURCE_ENV is null (~)
        if (!firstSourceEnvironment || firstSourceEnvironment === "None") {
            await syndicationCloudTaskRunner.skipToTask(CloudTaskNames.SYNDICATION_BQ_EXPORT, {}, 0);
            res.status(200).end();
            return;
        }
        req.log.info("Syndication get: syndication process started");
        await syndicationCloudTaskRunner.sendSlackMessage("*Syndication* :repeat:", "syndication process started");
        await syndicationCloudTaskRunner.taskDone({
            tableName: "countries",
            sourceEnvironments: ALL_SOURCE_ENVIRONMENTS,
        }, 0);
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication GET endpoint error");
        res.status(500).end();
    }
});

router.post("/export", async (req, res) => {
    try {
        const {
            tableName,
            sourceEnvironments,
        } = JSON.parse(Buffer.from(req.body, "base64").toString());

        req.log.info(
            `Syndication export: Handler called with tableName "${tableName}" and sourceEnvironments
            "${sourceEnvironments}"`,
        );
        var currentQueueId = null

        if (!ALLOWED_TABLE_NAMES.includes(tableName)) {
            debug("Unexpected source table name given");
            req.log.error("Syndication export error: Unexpected source table name given");
            res.status(200).end();
            return;
        }

        const currentSourceEnvironment = sourceEnvironments[0];
        const { project, instance, serviceAccountEmailAddress } = await getSourceEnvCloudSqlInstanceDetails(
            currentSourceEnvironment,
        );

        // Check if the most recent Cloud SQL operation is done, if not: re-queue this same task and exit
        if (!await isMostRecentCloudSqlOperationDone(project, instance)) {
            req.log.info("Syndication export: Task deferred as there is a Cloud SQL operation in progress");
            currentQueueId = syndicationCloudTaskRunner.currentTask? syndicationCloudTaskRunner.currentTask.getCloudTaskQueueId() : null
            if (currentQueueId) {
                await syndicationCloudTaskRunner.reQueueTask({
                    tableName: tableName,
                    sourceEnvironments: sourceEnvironments,
                });
            }
            else {
                req.log.info(`Syndication export: skipToTask ${CloudTaskNames.SYNDICATION_EXPORT}`);
                await syndicationCloudTaskRunner.skipToTask(CloudTaskNames.SYNDICATION_EXPORT, {
                    tableName: tableName,
                    sourceEnvironments: sourceEnvironments,
                }, 0);
            }
            res.status(200).end();
            return;
        }

        // Give bucket write permissions to the source environment's Cloud SQL instance service account
        await addUserToTargetCloudStorageBucketWriters(serviceAccountEmailAddress);

        const exportTable = tables.find((table) => {
            return table.name === tableName;
        });
        req.log.info(`Syndication export: Exporting ${exportTable.name} data ...`);
        const exportParams = await getSourceEnvCloudSqlExportParams(
            `${exportTable.name}.csv`, exportTable.name, exportTable.query, currentSourceEnvironment,
        );
        await startCloudSqlExportOperation(project, instance, exportParams);

        if (exportTable.next) {
            currentQueueId = syndicationCloudTaskRunner.currentTask? syndicationCloudTaskRunner.currentTask.getCloudTaskQueueId() : null
            req.log.info(`Syndication export: currentQueueId: ${currentQueueId}`);
            
            if (currentQueueId) {
                await syndicationCloudTaskRunner.reQueueTask({
                    tableName: exportTable.next,
                    sourceEnvironments: sourceEnvironments,
                });
            }
            else {
                req.log.info(`Syndication export: skipToTask ${CloudTaskNames.SYNDICATION_EXPORT}`);
                await syndicationCloudTaskRunner.skipToTask(CloudTaskNames.SYNDICATION_EXPORT, {
                    tableName: exportTable.next,
                    sourceEnvironments: sourceEnvironments,
                }, 0);
            }
        }
        else {
            req.log.info(`Syndication export: sendSlackMessage ${currentSourceEnvironment}`);
            await syndicationCloudTaskRunner.sendSlackMessage(`- export ${currentSourceEnvironment} :heavy_check_mark:`, "syndication export status");
            sourceEnvironments.splice(0, 1);
            if (sourceEnvironments.length > 0) {
                await syndicationCloudTaskRunner.reQueueTask({
                    tableName: "countries",
                    sourceEnvironments: sourceEnvironments,
                }, 0);
            }
            else {
                await syndicationCloudTaskRunner.taskDone({
                    lastSourceEnvironment: currentSourceEnvironment,
                }, 0);
            }
        }
        res.status(200).end();
    }
    catch (error) {
        debug(error);
        req.log.error(error, "Syndication export error");
        res.status(500).end();
    }
});

router.post("/import", async (req, res) => {
    try {
        const {
            tableName,
            sourceEnvironments,
            lastSourceEnvironment,
        } = JSON.parse(Buffer.from(req.body, "base64").toString());

        req.log.info(
            `Syndication import: Handler called with tableName "${tableName}" and sourceEnvironments
            "${sourceEnvironments}"`,
        );

        if (!ALLOWED_TABLE_NAMES.includes(tableName)) {
            debug("Unexpected source table name given");
            req.log.error("Syndication import error: Unexpected source table name given");
            res.status(200).end();
            return;
        }

        // If lastSourceEnvironment is defined, then this is the first import task in the chain and we check if the last
        // export operation has completed
        let isMostRecentCloudSqlOperationInLastSourceEnvironmentDone = true;
        if (lastSourceEnvironment) {
            const {
                project: lastSourceEnvironmentProject,
                instance: lastSourceEnvironmentInstance,
            } = await getSourceEnvCloudSqlInstanceDetails(lastSourceEnvironment);

            isMostRecentCloudSqlOperationInLastSourceEnvironmentDone = await isMostRecentCloudSqlOperationDone(
                lastSourceEnvironmentProject, lastSourceEnvironmentInstance,
            );
        }

        const {
            project: targetEnvironmentProject,
            instance: targetEnvironmentInstance,
            serviceAccountEmailAddress: targetEnvironmentServiceAccountEmailAddress,
        } = await getTargetEnvCloudSqlInstanceDetails();

        const isMostRecentCloudSqlOperationInTargetEnvironmentDone = await isMostRecentCloudSqlOperationDone(
            targetEnvironmentProject, targetEnvironmentInstance,
        );

        // Check if the most recent Cloud SQL operations are done, if not: re-queue this same task and exit
        if (!isMostRecentCloudSqlOperationInLastSourceEnvironmentDone
            || !isMostRecentCloudSqlOperationInTargetEnvironmentDone) {
            req.log.info("Syndication import: Task deferred as there is a Cloud SQL operation in progress");
            await syndicationCloudTaskRunner.reQueueTask({
                tableName: tableName,
                sourceEnvironments: sourceEnvironments,
                lastSourceEnvironment: lastSourceEnvironment,
            });
            res.status(200).end();
            return;
        }

        const importTable = tables.find((table) => {
            return table.name === tableName;
        });

        const currentSourceEnvironment = sourceEnvironments[0];

        // Give file read permissions to the target environment's Cloud SQL instance service account
        if (SYND_TARGET_ENV !== "ofda" && !"crc,adra,nrc,world-vision,aah,drc".includes(currentSourceEnvironment) && !SYND_SOURCE_ENV.includes("ofda")) {
            await addUserToTargetCloudStorageFileReaders(
                targetEnvironmentServiceAccountEmailAddress,
                `${currentSourceEnvironment}-${SYND_ENV_TYPE}-${importTable.name}.csv`,
            );
        }

        req.log.info(`Syndication import: Importing ${importTable.name} data ...`);
        const importParams = await getTargetEnvCloudSqlImportParams(
            `${importTable.name}.csv`, importTable.name, currentSourceEnvironment,
        );

        await startCloudSqlImportOperation(targetEnvironmentProject, targetEnvironmentInstance, importParams);

        if (importTable.next) {
            await syndicationCloudTaskRunner.reQueueTask({
                tableName: importTable.next,
                sourceEnvironments: sourceEnvironments,
            });
        }
        else {
            await syndicationCloudTaskRunner.sendSlackMessage(`- import ${currentSourceEnvironment} :heavy_check_mark:`, "syndication import status");
            sourceEnvironments.splice(0, 1);
            if (sourceEnvironments.length > 0) {
                await syndicationCloudTaskRunner.reQueueTask({
                    tableName: "countries",
                    sourceEnvironments: sourceEnvironments,
                });
                // we need the (default, 30s) task delay here because, while we are moving on to importing from a
                // different source environment file, all of the Cloud SQL import operations run on the target
                // environment
            }
            else {
                await syndicationCloudTaskRunner.taskDone({
                    lastSourceEnvironment: currentSourceEnvironment,
                });
                // we need the (default, 30s) task delay here because the last Cloud SQL import operation needs to
                // have completed (the migrate_all_data task does its own check too)
            }
        }
        res.status(200).end();
    }
    catch (error) {
        debug(error);
        req.log.error(error, "Syndication import error");
        res.status(500).end();
    }
});

router.post("/export_for_big_query", async (req, res) => {
    try {
        const { project, instance } = await getTargetEnvCloudSqlInstanceDetails();

        // Check if the most recent Cloud SQL operation is done, if not: re-queue this same task and exit
        // (the migrate_all_data task does its own check, but worth keeping this here in case something other than
        //  syndication starts any operations)
        if (!await isMostRecentCloudSqlOperationDone(project, instance)) {
            req.log.info("Syndication BigQuery export: Task deferred as there is a Cloud SQL operation in progress");
            await syndicationCloudTaskRunner.reQueueTask({});
            res.status(200).end();
            return;
        }
        await syndicationCloudTaskRunner.sendSlackMessage("*BigQuery :repeat:*", "syndication BigQuery export process started");
        const dbName = await getTargetDatabaseName();
        req.log.info(`Syndication BigQuery export: Exporting data from database: ${dbName} ...`);

        const exportParams = {
            uri: `gs://kujakuja-${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-syndication/${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-responses.csv`,
            databases: [
                dbName,
            ],
            kind: "sql#exportContext",
            sqlExportOptions: {
                tables: [
                    "countries",
                    "settlements",
                    "service_types",
                    "service_points",
                    "users",
                    "responses",
                ],
                schemaOnly: false,
            },
            csvExportOptions: {
                selectQuery: getExportQueryForBigQuery(false),
            },
            fileType: "CSV",
        };

        await startCloudSqlExportOperation(project, instance, exportParams);
        await syndicationCloudTaskRunner.sendSlackMessage("- responses export :heavy_check_mark:", "syndication BigQuery responses export status");
        await syndicationCloudTaskRunner.taskDone({});
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication BigQuery responses export error");
        res.status(500).end();
    }
});

router.post("/load_into_big_query", async (req, res) => {
    try {
        const { project, instance } = await getTargetEnvCloudSqlInstanceDetails();

        // Check if the most recent Cloud SQL operation is done, if not: re-queue this same task and exit
        if (!await isMostRecentCloudSqlOperationDone(project, instance)) {
            req.log.info(
                "Syndication BigQuery responses upload: Task deferred as there is a Cloud SQL operation in progress",
            );
            await syndicationCloudTaskRunner.reQueueTask({});
            res.status(200).end();
            return;
        }

        const datasetId = "kujakuja";
        await acquireTargetBigQueryDataset(datasetId);

        const tableId = `kk_${SYND_TARGET_ENV.replace(/\W/g, "_")}_daily`;
        const tableSchema = getTableSchemaForBigQuery(false);
        const tableReference = await acquireTargetBigQueryTable(datasetId, tableId, tableSchema);
        const filename = `${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-responses.csv`;
        await createBigQueryLoadJob(datasetId, tableId, tableReference, tableSchema, filename);
        await syndicationCloudTaskRunner.sendSlackMessage("- responses upload :heavy_check_mark:", "BigQuery responses upload status");
        await syndicationCloudTaskRunner.taskDone({}, 0);
        // no task delay required as loading into BigQuery does not run as a Cloud SQL operation
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication BigQuery responses upload error");
        res.status(500).end();
    }
});

router.post("/export_for_big_query_with_tags", async (req, res) => {
    try {
        const { project, instance } = await getTargetEnvCloudSqlInstanceDetails();

        // Check if the most recent Cloud SQL operation is done, if not: re-queue this same task and exit
        // (this check is technically not required, but worth keeping this here in case something other than syndication
        //  starts any operations)
        if (!await isMostRecentCloudSqlOperationDone(project, instance)) {
            req.log.info(
                "Syndication BigQuery export with tags: Task deferred as there is a Cloud SQL operation in progress",
            );
            await syndicationCloudTaskRunner.reQueueTask({});
            res.status(200).end();
            return;
        }
        await syndicationCloudTaskRunner.sendSlackMessage("*BigQuery with tags :repeat:*", "syndication BigQuery export with tags process started");

        const exportParams = {
            uri: `gs://kujakuja-${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-syndication/${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-responses-w-tags.csv`,
            databases: [
                "kujakuja",
            ],
            kind: "sql#exportContext",
            sqlExportOptions: {
                tables: [
                    "countries",
                    "settlements",
                    "service_types",
                    "service_points",
                    "users",
                    "responses",
                    "tags",
                ],
                schemaOnly: false,
            },
            csvExportOptions: {
                selectQuery: getExportQueryForBigQuery(true),
            },
            fileType: "CSV",
        };

        await startCloudSqlExportOperation(project, instance, exportParams);
        await syndicationCloudTaskRunner.sendSlackMessage("- responses with tags export :heavy_check_mark:", "BigQuery responses with tags export status");
        await syndicationCloudTaskRunner.taskDone({});
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication BigQuery responses with tags export error");
        res.status(500).end();
    }
});

router.post("/load_into_big_query_with_tags", async (req, res) => {
    try {
        const { project, instance } = await getTargetEnvCloudSqlInstanceDetails();

        // Check if the most recent Cloud SQL operation is done, if not: re-queue this same task and exit
        if (!await isMostRecentCloudSqlOperationDone(project, instance)) {
            req.log.info(
                "Syndication BigQuery responses with tags upload: Task deferred as there is a Cloud SQL operation in progress",
            );
            await syndicationCloudTaskRunner.reQueueTask({});
            res.status(200).end();
            return;
        }

        const datasetId = "kujakuja";
        await acquireTargetBigQueryDataset(datasetId);

        const tableId = `kk_${SYND_TARGET_ENV.replace(/\W/g, "_")}_daily_w_tags`;
        const tableSchema = getTableSchemaForBigQuery(true);
        const tableReference = await acquireTargetBigQueryTable(datasetId, tableId, tableSchema);
        const filename = `${SYND_TARGET_ENV}-${SYND_ENV_TYPE}-responses-w-tags.csv`;
        await createBigQueryLoadJob(datasetId, tableId, tableReference, tableSchema, filename);
        await syndicationCloudTaskRunner.sendSlackMessage("- responses with tags upload :heavy_check_mark:", "BigQuery responses with tags upload status");
        await syndicationCloudTaskRunner.sendSlackReaction("heavy_check_mark", "data run completed");
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication BigQuery responses with tags upload error");
        res.status(500).end();
    }
});

module.exports = router;
