const debug = require("debug")("kk:task_handlers:syndication_schemas_and_migration");
const express = require("express");

const logger = require("../../config/logging");
const knex = require("../../knex");
const { getSourceEnvCloudSqlInstanceDetails, isMostRecentCloudSqlOperationDone } = require("./syndication_helpers");
const { syndicationCloudTaskRunner } = require("./cloud_tasks_runner");

const router = express.Router();

const {
    SYND_SOURCE_ENV, SYND_TARGET_ENV,
} = process.env;

const createAllSchemas = async () => {
    const schemaCreationPromises = SYND_SOURCE_ENV.split(",").map(async (envName) => {
        logger.info(`Syndication schema creation: Creating schema for ${envName} ...`);

        // NB: Note the use of single quotes vs. double quotes around the ${envName} placeholders in the following
        // template literal. Where envName is used as a SQL identifier it should be enclosed in double quotes to allow
        // for special characters, like dashes, in the schema name. Where it's used as a string value, for example when
        // comparing it to a column value, it should be enclosed in single quotes.
        let schemaCreationScript = `DO $$
            BEGIN
                IF EXISTS(
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = '${envName}'
                )
                THEN
                DROP SCHEMA "${envName}" CASCADE;
                END IF;
            END
            $$;

            CREATE SCHEMA "${envName}" AUTHORIZATION cloudsqlsuperuser;

            CREATE TABLE "${envName}".countries (
                id bigserial NOT NULL,
                enabled bool NULL,
                "name" varchar NULL,
                iso_two_letter_code varchar NULL,
                geojson jsonb NULL,
                lat numeric(12,8) NOT NULL DEFAULT '0'::numeric,
                lng numeric(12,8) NOT NULL DEFAULT '0'::numeric,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT countries_pkey PRIMARY KEY (id)
            );

            CREATE TABLE "${envName}".settlements (
                id bigserial NOT NULL,
                "name" varchar NULL,
                geojson jsonb NULL DEFAULT '{}'::jsonb,
                lat numeric(12,8) NULL,
                lng numeric(12,8) NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                country_id int8 NULL,
                CONSTRAINT settlements_pkey PRIMARY KEY (id)
            );

            ALTER TABLE "${envName}".settlements
            ADD CONSTRAINT settlements_country_id_foreign
            FOREIGN KEY (country_id) REFERENCES "${envName}".countries(id);

            CREATE TABLE "${envName}".service_types (
                id bigserial NOT NULL,
                "name" varchar NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT service_types_pkey PRIMARY KEY (id)
            );

            CREATE TABLE "${envName}".service_points (
                id bigserial NOT NULL,
                service_type_id int8 NULL,
                settlement_id int8 NULL,
                "name" varchar NULL,
                lat numeric(12,8) NULL,
                lng numeric(12,8) NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT service_points_pkey PRIMARY KEY (id)
            );

            ALTER TABLE "${envName}".service_points
            ADD CONSTRAINT service_points_service_type_id_foreign
            FOREIGN KEY (service_type_id) REFERENCES "${envName}".service_types(id);

            ALTER TABLE "${envName}".service_points
            ADD CONSTRAINT service_points_settlement_id_foreign
            FOREIGN KEY (settlement_id) REFERENCES "${envName}".settlements(id);

            CREATE TABLE "${envName}".users (
                id bigserial NOT NULL,
                email varchar NOT NULL DEFAULT ''::character varying,
                encrypted_password varchar NOT NULL DEFAULT ''::character varying,
                reset_password_token varchar NULL,
                reset_password_sent_at timestamptz NULL,
                remember_created_at timestamptz NULL,
                sign_in_count int4 NOT NULL DEFAULT 0,
                current_sign_in_at timestamptz NULL,
                last_sign_in_at timestamptz NULL,
                current_sign_in_ip inet NULL,
                last_sign_in_ip inet NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                is_admin bool NOT NULL DEFAULT false,
                provider varchar NOT NULL DEFAULT 'email'::character varying,
                uid varchar NOT NULL DEFAULT ''::character varying,
                tokens json NULL,
                settlement_id int8 NULL,
                is_survey bool NOT NULL DEFAULT false,
                is_service_provider bool NULL DEFAULT false,
                CONSTRAINT users_pkey PRIMARY KEY (id)
            );

            ALTER TABLE "${envName}".users
            ADD CONSTRAINT users_settlement_id_foreign
            FOREIGN KEY (settlement_id) REFERENCES "${envName}".settlements(id);

            CREATE TABLE "${envName}".responses (
                id bigserial NOT NULL,
                service_point_id int8 NULL,
                satisfied bool NULL,
                idea varchar NULL,
                lat numeric(12,8) NULL,
                lng numeric(12,8) NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                phase2_id int8 NULL,
                uploaded_at timestamptz NULL,
                unique_id varchar NULL,
                user_id int8 NULL,
                response_type varchar NOT NULL DEFAULT ''::character varying,
                is_starred bool NULL DEFAULT false,
                nlp_extract_adjectives_processed bool NULL DEFAULT false,
                idea_language varchar(128) NULL DEFAULT 'es'::character varying,
                idea_token_vector tsvector NULL,
                CONSTRAINT responses_pkey PRIMARY KEY (id),
                CONSTRAINT responses_unique_id_unique UNIQUE (unique_id)
            );

            ALTER TABLE "${envName}".responses
            ADD CONSTRAINT responses_service_point_id_foreign
            FOREIGN KEY (service_point_id) REFERENCES "${envName}".service_points(id);

            ALTER TABLE "${envName}".responses
            ADD CONSTRAINT responses_user_id_foreign
            FOREIGN KEY (user_id) REFERENCES "${envName}".users(id);

            CREATE TABLE "${envName}".service_type_map (
                source_env varchar NULL,
                source_service_type_id int8 NULL,
                source_service_type_name varchar NULL,
                target_env varchar NULL,
                target_service_type_id int8 NULL,
                target_service_type_name varchar NULL
            );`;

        let serviceTypeMappingsInsertionScript = "";

        /* eslint-disable max-len */
        if (SYND_TARGET_ENV === "ofda") {
            if (envName === "crc") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('crc',1,'Nutrition','ofda',6,'Nutrition');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('crc',2,'Healthcare','ofda',3,'Healthcare');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('crc',3,'Farmacia','ofda',3,'Healthcare');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('crc',4,'Sala de espera','ofda',3,'Healthcare');
                `;
            }

            if (envName === "nrc") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('nrc',3,'Cash Transfer','ofda',9,'Cash Transfer');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('nrc',4,'Legal Advice','ofda',10,'Legal Advice');
                `;
            }

            if (envName === "adra") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('adra',3,'Water','ofda',1,'Water');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('adra',4,'Mental Health','ofda',3,'Healthcare');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('adra',1,'Healthcare','ofda',3,'Healthcare');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('adra',2,'Community Pulse','ofda',7,'Community Pulse');
                `;
            }

            if (envName === "world-vision") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('world-vision',1,'Cash Transfer','ofda',9,'Cash Transfer');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('world-vision',2,'Community Pulse','ofda',7,'Community Pulse');
                `;
            }

            if (envName === "aah") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('aah',3,'Cash Transfer','ofda',9,'Cash Transfer');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('aah',1,'Community Pulse','ofda',7,'Community Pulse');
                `;
            }

            if (envName === "drc") {
                serviceTypeMappingsInsertionScript = `
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('drc',2,'Cash Transfer','ofda',9,'Cash Transfer');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('drc',1,'Community Pulse','ofda',7,'Community Pulse');
                `;
            }

            schemaCreationScript = schemaCreationScript.concat("\n\n", serviceTypeMappingsInsertionScript);
        }

        if (SYND_TARGET_ENV === "crc") {
            if (envName === "ofda") {
                serviceTypeMappingsInsertionScript = `
                
                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',1,'Water','crc',11,'Water');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',2,'Protection','crc',12,'Protection');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',3,'Healthcare','crc',2,'Healthcare');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',4,'Livelihoods','crc',13,'Livelihoods');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',5,'Shelter','crc',14,'Shelter');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',6,'Nutrition','crc',1,'Nutrición');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',7,'Community Pulse','crc',8,'Community Pulse');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',8,'Group Activities','crc',15,'Group Activities');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',9,'Cash Transfer','crc',9,'Cash Transfer');

                    INSERT INTO "${envName}".service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
                    VALUES ('ofda',10,'Legal Advice','crc',10,'Legal Advice');
                `;
            }
            schemaCreationScript = schemaCreationScript.concat("\n\n", serviceTypeMappingsInsertionScript);
        }
        /* eslint-enable max-len */

        return knex.raw(schemaCreationScript).then(async () => {
            await syndicationCloudTaskRunner.sendSlackMessage(`- drop and create schema ${envName} :heavy_check_mark:`,
                                                              "syndication drop and create schema status");
        });
    });
    await Promise.all(schemaCreationPromises);
};

const migrateAllData = async () => {
    const defaultOffsetStart = 1000000000;
    const defaultOffsetIncrement = 1000000000;
    let offsetStart = defaultOffsetStart;

    logger.info("Syndication data migration: Deleting previously migrated data ...");

    const dataDeletionScript = `
        DELETE FROM public.responses WHERE id > ${offsetStart};
        DELETE FROM public.users WHERE id > ${offsetStart};
        DELETE FROM public.service_points WHERE id > ${offsetStart};
        --DELETE FROM public.service_types WHERE id > ${offsetStart};
        DELETE FROM public.settlements WHERE id > ${offsetStart};
        --DELETE FROM public.countries WHERE id > ${offsetStart};
    `;

    const syndicatedTagIdsToDelete = await knex("tags")
        .where("response_id", ">", offsetStart)
        .pluck("id");
    const syndicatedProvenanceIdsToDelete = await knex("tag_provenance")
        .whereIn("tag_id", syndicatedTagIdsToDelete)
        .pluck("id");

    if (syndicatedTagIdsToDelete && syndicatedTagIdsToDelete.length) {
        await knex.transaction(async (trx) => {
            await trx("tag_provenance")
                .whereIn("id", syndicatedProvenanceIdsToDelete)
                .delete();
            await trx("tags")
                .whereIn("id", syndicatedTagIdsToDelete)
                .delete();
        });
    }

    await knex.raw(dataDeletionScript);
    await syndicationCloudTaskRunner.sendSlackMessage(`- delete previously migrated data :heavy_check_mark:`, "syndication delete previously migrated data status");

    for (const envName of SYND_SOURCE_ENV.split(",")) { // eslint-disable-line no-restricted-syntax
        logger.info(`Syndication data migration: Migrating data for ${envName} ...`);

        const emailSuffix = ".".concat(envName); // e.g ".crc"
        const partnerPrefix = envName.toUpperCase().concat(" "); // e.g "CRC "

        // NB: Note the use of single quotes vs. double quotes around the ${envName} placeholders in the following
        // template literal. Where envName is used as a SQL identifier it should be enclosed in double quotes to allow
        // for special characters, like dashes, in the schema name. Where it's used as a string value, for example when
        // comparing it to a column value, it should be enclosed in single quotes.
        /* eslint-disable max-len */
        const dataMigrationScript = `
            INSERT INTO public.settlements (id, "name", geojson, lat, lng, created_at, updated_at, country_id)
            SELECT id + ${offsetStart}, concat('${partnerPrefix}', "name"), geojson, lat, lng, created_at, updated_at, country_id
            FROM "${envName}".settlements;

            INSERT INTO public.users (id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, uid, tokens, settlement_id, is_survey, is_service_provider)
            SELECT u.id + ${offsetStart}, concat("email", '${emailSuffix}'), 'syndicated user, not allowed to login', reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, concat(uid, '${emailSuffix}'), tokens, settlement_id + ${offsetStart}, is_survey, is_service_provider
            FROM "${envName}".users u;

            INSERT INTO public.service_points (id, service_type_id, settlement_id, "name", lat, lng, created_at, updated_at)
            SELECT id + ${offsetStart}, target_service_type_id, settlement_id + ${offsetStart}, concat('${partnerPrefix}', "name"), lat, lng, created_at, updated_at
            FROM "${envName}".service_points sp
            INNER JOIN "${envName}".service_type_map st_map
            ON st_map.source_env = '${envName}' AND sp.service_type_id = st_map.source_service_type_id AND st_map.target_env = '${SYND_TARGET_ENV}';

            INSERT INTO public.responses (id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector)
            SELECT id + ${offsetStart}, service_point_id + ${offsetStart}, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, concat(unique_id,'${envName.toUpperCase()}'), user_id + ${offsetStart}, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector
            FROM "${envName}".responses;
        `;
        /* eslint-enable max-len */

        /* eslint-disable no-await-in-loop */
        await knex.raw(dataMigrationScript);
        await syndicationCloudTaskRunner.sendSlackMessage(`- migrate ${envName} :heavy_check_mark:`, "syndication data migration status");
        /* eslint-enable no-await-in-loop */

        offsetStart += defaultOffsetIncrement;
    }
};

router.post("/create_all_schemas", async (req, res) => {
    try {
        const { lastSourceEnvironment } = JSON.parse(Buffer.from(req.body, "base64").toString());
        await createAllSchemas();
        req.log.info("Syndication schema creation: All schemas created successfully");

        await syndicationCloudTaskRunner.taskDone({
            tableName: "countries",
            sourceEnvironments: SYND_SOURCE_ENV.split(","),
            lastSourceEnvironment: lastSourceEnvironment,
        }, 0);
        // no task delay required as schema creation does not run as a Cloud SQL operation and is guaranteed to be
        // completed at this point
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication schema creation error");
        res.status(500).end();
    }
});

router.post("/migrate_all_data", async (req, res) => {
    try {
        const { lastSourceEnvironment } = JSON.parse(Buffer.from(req.body, "base64").toString());

        // Check if the most recent Cloud SQL operation in the target environment is done, if not: re-queue this same
        // task and exit
        const {
            project: lastSourceEnvironmentProject,
            instance: lastSourceEnvironmentInstance,
        } = await getSourceEnvCloudSqlInstanceDetails(lastSourceEnvironment);

        if (!await isMostRecentCloudSqlOperationDone(lastSourceEnvironmentProject, lastSourceEnvironmentInstance)) {
            req.log.info("Syndication data migration: Task deferred as there is a Cloud SQL operation in progress");
            await syndicationCloudTaskRunner.reQueueTask({
                lastSourceEnvironment: lastSourceEnvironment,
            });
            res.status(200).end();
            return;
        }

        await migrateAllData();
        req.log.info("Syndication data migration: All data migrated successfully");
        await syndicationCloudTaskRunner.taskDone({}, 0);
        // no task delay required as data migration does not run as a Cloud SQL operation and is guaranteed to be
        // completed at this point
        res.status(200).end();
    }
    catch (err) {
        debug(err);
        req.log.error(err, "Syndication data migration error");
        res.status(500).end();
    }
});

module.exports = router;
