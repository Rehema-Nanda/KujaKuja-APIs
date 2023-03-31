
exports.up = async function(knex) {
    // create index on name column
    await knex.schema.table('service_types', function (table) {
        table.index(['name'], 'index_service_types_on_name');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('service_types', function (table) {
        table.dropIndex(['name'], 'index_service_types_on_name');
    });
};
