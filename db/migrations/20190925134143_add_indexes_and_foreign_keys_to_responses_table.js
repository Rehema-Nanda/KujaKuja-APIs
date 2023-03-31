exports.up = async (knex) => {
    // delete responses with NULL service_point_id, backed up in ../backups/
    await knex.raw(`
        BEGIN TRANSACTION;
        DELETE FROM gcloud_nl_api_responses WHERE response_id IN (SELECT id FROM responses WHERE service_point_id IS NULL);
        DELETE FROM responses_adjectives WHERE response_id IN (SELECT id FROM responses WHERE service_point_id IS NULL);
        DELETE FROM responses WHERE service_point_id IS NULL;
        COMMIT TRANSACTION;
        `
    );

    // delete responses with UNRECOGNISED service_point_id, backed up in ../backups/
    await knex.raw(`
        BEGIN TRANSACTION;
        DELETE FROM gcloud_nl_api_responses WHERE response_id IN (SELECT id FROM responses WHERE service_point_id NOT IN (SELECT id FROM service_points));
        DELETE FROM responses_adjectives WHERE response_id IN (SELECT id FROM responses WHERE service_point_id NOT IN (SELECT id FROM service_points)); 
        DELETE FROM responses WHERE service_point_id NOT IN (SELECT id FROM service_points);
        COMMIT TRANSACTION;
        `
    );

    // create indexes on created_at, satisfied, response_type & is_starred columns
    // create foreign key on service_point_id column, rename foreign key on user_id column
    await knex.schema.table('responses', function (table) {
        table.index(['created_at'], 'index_responses_on_created_at');
        table.index(['satisfied'], 'index_responses_on_satisfied');
        table.index(['response_type'], 'index_responses_on_response_type');
        table.index(['is_starred'], 'index_responses_on_is_starred');

        table.foreign('service_point_id',  'responses_service_point_id_foreign')
            .references('id')
            .inTable('service_points');

        table.dropForeign(['user_id'], 'fk_rails_2bd9a0753e');
        table.foreign('user_id',  'responses_user_id_foreign')
            .references('id')
            .inTable('users');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('responses', function (table) {
        table.dropIndex(['created_at'], 'index_responses_on_created_at');
        table.dropIndex(['satisfied'], 'index_responses_on_satisfied');
        table.dropIndex(['response_type'], 'index_responses_on_response_type');
        table.dropIndex(['is_starred'], 'index_responses_on_is_starred');

        table.dropForeign(['service_point_id'], 'responses_service_point_id_foreign');

        table.dropForeign(['user_id'], 'responses_user_id_foreign');
        table.foreign('user_id',  'fk_rails_2bd9a0753e')
            .references('id')
            .inTable('users');
    });
};
