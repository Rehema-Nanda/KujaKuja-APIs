exports.up = async (knex) => {
    // create index on availability_time column
    // create foreign key on service_point_id column
    await knex.schema.table('service_point_availabilities', function (table) {
        table.index(['availability_time'], 'index_service_point_availabilities_on_availability_time');

        table.foreign('service_point_id', 'service_point_availabilities_service_point_id_foreign')
            .references('id')
            .inTable('service_points');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('service_point_availabilities', function (table) {
        table.dropIndex(['availability_time'], 'index_service_point_availabilities_on_availability_time');

        table.dropForeign(['service_point_id'], 'service_point_availabilities_service_point_id_foreign');
    });
};
