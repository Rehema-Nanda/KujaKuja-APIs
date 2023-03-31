
exports.up = async function(knex) {
    await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS cube;');
    await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS earthdistance;');

    await knex.schema.createTable('adjectives', function (table) {
        table.bigincrements();
        table.specificType('name', 'character varying').notNullable();
    });
    await knex.schema.raw('CREATE UNIQUE INDEX index_adjectives_on_name ON public.adjectives ' +
        'USING btree (name COLLATE pg_catalog."default") TABLESPACE pg_default;');

    await knex.schema.createTable('countries', function (table) {
        table.bigincrements();
        table.boolean('enabled');
        table.specificType('name', 'character varying');
        table.specificType('iso_two_letter_code', 'character varying');
        table.jsonb('geojson');
        table.decimal('lat', 12, 8).notNullable().defaultTo(0);
        table.decimal('lng', 12, 8).notNullable().defaultTo(0);
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
    });

    await knex.schema.createTable('settlements', function (table) {
        table.bigincrements();
        table.specificType('name', 'character varying');
        table.jsonb('geojson').defaultTo('{}');
        table.decimal('lat', 12, 8);
        table.decimal('lng', 12, 8);
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.specificType('photo_updated_at', 'timestamp without time zone');
        table.bigInteger('country_id').index('index_settlements_on_country_id');
        table.foreign('country_id', 'fk_rails_bca4ce09e0').references('countries.id').onUpdate('NO ACTION').onDelete('NO ACTION');
        table.index(['lat', 'lng'], 'index_settlements_on_lat_and_lng');
    });
    await knex.schema.raw('CREATE INDEX settlements_earthdistance_ix ON public.settlements ' +
        'USING gist (ll_to_earth(lat::double precision, lng::double precision)) TABLESPACE pg_default;');

    await knex.schema.createTable('featured_ideas', function (table) {
        table.bigincrements();
        table.specificType('idea', 'character varying');
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.bigInteger('settlement_id').index('index_featured_ideas_on_settlement_id');
        table.foreign('settlement_id', 'fk_rails_2c474859e2').references('settlements.id').onUpdate('NO ACTION').onDelete('NO ACTION');
    });

    await knex.schema.createTable('users', function (table) {
        table.bigincrements();
        table.specificType('email', 'character varying').notNullable().defaultTo('');
        table.specificType('encrypted_password', 'character varying').notNullable().defaultTo('');
        table.specificType('reset_password_token', 'character varying');
        table.specificType('reset_password_sent_at', 'timestamp without time zone');
        table.specificType('remember_created_at', 'timestamp without time zone');
        table.integer('sign_in_count').notNullable().defaultTo(0);
        table.specificType('current_sign_in_at', 'timestamp without time zone');
        table.specificType('last_sign_in_at', 'timestamp without time zone');
        table.specificType('current_sign_in_ip', 'inet');
        table.specificType('last_sign_in_ip', 'inet');
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.boolean('is_admin').notNullable().defaultTo(false);
        table.specificType('provider', 'character varying').notNullable().defaultTo('email');
        table.specificType('uid', 'character varying').notNullable().defaultTo('');
        table.json('tokens');
        table.bigInteger('settlement_id');
        table.foreign('settlement_id', 'fk_rails_236f55fae2').references('settlements.id').onUpdate('NO ACTION').onDelete('NO ACTION');
        table.boolean('is_survey').notNullable().defaultTo(false);
        table.boolean('is_service_provider').defaultTo(false);
    });
    await knex.schema.raw('CREATE UNIQUE INDEX index_users_on_email ON public.users ' +
        'USING btree (email COLLATE pg_catalog."default") TABLESPACE pg_default;');
    await knex.schema.raw('CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users ' +
        'USING btree (reset_password_token COLLATE pg_catalog."default") TABLESPACE pg_default;');
    await knex.schema.raw('CREATE UNIQUE INDEX index_users_on_uid_and_provider ON public.users ' +
        'USING btree (uid COLLATE pg_catalog."default", provider COLLATE pg_catalog."default") TABLESPACE pg_default;');

    await knex.schema.createTable('responses', function (table) {
        table.bigincrements();
        table.bigInteger('service_point_id').index('index_responses_on_service_point_id');
        table.boolean('satisfied');
        table.specificType('idea', 'character varying');
        table.decimal('lat', 12, 8);
        table.decimal('lng', 12, 8);
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.bigInteger('phase2_id').index('index_responses_on_phase2_id');
        table.specificType('uploaded_at', 'timestamp without time zone').index('index_responses_on_uploaded_at');
        table.specificType('unique_id', 'character varying');
        table.bigInteger('user_id').index('index_responses_on_user_id');
        table.specificType('response_type', 'character varying').notNullable().defaultTo('');
        table.boolean('is_starred').defaultTo(false);
        table.boolean('nlp_extract_adjectives_processed').defaultTo(false);
        table.foreign('user_id', 'fk_rails_2bd9a0753e').references('users.id').onUpdate('NO ACTION').onDelete('NO ACTION');
        table.index(['lat', 'lng'], 'index_responses_on_lat_and_lng');
    });
    await knex.schema.raw('CREATE INDEX responses_earthdistance_ix ON public.responses ' +
        'USING gist (ll_to_earth(lat::double precision, lng::double precision)) TABLESPACE pg_default;');

    await knex.schema.createTable('responses_adjectives', function (table) {
         table.bigInteger('adjective_id').notNullable().index('index_responses_adjectives_on_adjective_id');
         table.bigInteger('response_id').notNullable().index('index_responses_adjectives_on_response_id');
         table.integer('count').notNullable().index('index_responses_adjectives_on_count');
         table.foreign('adjective_id', 'fk_rails_33559f6bf2').references('adjectives.id').onUpdate('NO ACTION').onDelete('NO ACTION');
         table.foreign('response_id', 'fk_rails_aa8513d782').references('responses.id').onUpdate('NO ACTION').onDelete('NO ACTION');
    });
    await knex.schema.raw('CREATE UNIQUE INDEX index_responses_adjectives_on_adjective_id_and_response_id ON public.responses_adjectives ' +
        'USING btree (adjective_id, response_id) TABLESPACE pg_default;');

    await knex.schema.createTable('service_point_availabilities', function (table) {
        table.bigincrements();
        table.bigInteger('service_point_id').notNullable().index('index_service_point_availabilities_on_service_point_id');
        table.boolean('available').notNullable();
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('uploaded_at', 'timestamp without time zone').defaultTo(knex.fn.now());
        table.specificType('availability_time', 'timestamp without time zone');
        table.specificType('unique_id', 'character varying');
    });

    await knex.schema.createTable('service_points', function (table) {
        table.bigincrements();
        table.bigInteger('service_type_id').index('index_service_points_on_service_type_id');
        table.bigInteger('settlement_id').index('index_service_points_on_settlement_id');
        table.specificType('name', 'character varying');
        table.decimal('lat', 12, 8);
        table.decimal('lng', 12, 8);
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.specificType('photo_updated_at', 'timestamp without time zone');
        table.boolean('available').defaultTo(false);
        table.specificType('last_availability_time', 'timestamp without time zone').defaultTo(knex.fn.now());
        table.boolean('is_binary_only').notNullable().defaultTo(false);
        table.boolean('capture_availability').notNullable().defaultTo(true);
        table.boolean('allow_starred_ideas').defaultTo(false);
        table.index(['lat', 'lng'], 'index_service_points_on_lat_and_lng');
    });
    await knex.schema.raw('CREATE INDEX service_points_earthdistance_ix ON public.service_points ' +
        'USING gist (ll_to_earth(lat::double precision, lng::double precision)) TABLESPACE pg_default;');

    await knex.schema.createTable('service_types', function (table) {
        table.bigincrements();
        table.specificType('name', 'character varying');
        table.specificType('created_at', 'timestamp without time zone').notNullable();
        table.specificType('updated_at', 'timestamp without time zone').notNullable();
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.specificType('photo_updated_at', 'timestamp without time zone');
    });
};

exports.down = async function(knex) {

};
