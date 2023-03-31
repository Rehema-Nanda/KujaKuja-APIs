exports.up = async (knex) => {
    // create index on name column
    // create foreign keys on settlement_id and service_type_id columns
    await knex.schema.table('service_points', function (table) {
        table.index(['name'], 'index_service_points_on_name');

        table.foreign('settlement_id', 'service_points_settlement_id_foreign')
            .references('id')
            .inTable('settlements');

        table.foreign('service_type_id', 'service_points_service_type_id_foreign')
            .references('id')
            .inTable('service_types');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('service_points', function (table) {
        table.dropIndex(['name'], 'index_service_points_on_name');

        table.dropForeign(['settlement_id'], 'service_points_settlement_id_foreign');
        table.dropForeign(['service_type_id'], 'service_points_service_type_id_foreign');
    });
};
