
exports.up = async function(knex) {
    await knex.schema.table('responses', function (table) {
        table.unique('unique_id');
    });

    await knex.schema.table('service_point_availabilities', function (table) {
        table.unique('unique_id');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('responses', function (table) {
        table.dropUnique('unique_id');
    });

    await knex.schema.table('service_point_availabilities', function (table) {
        table.dropUnique('unique_id');
    });
};
