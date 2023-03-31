
exports.up = async function(knex) {
    await knex.schema.createTable('config', function (table) {
        table.string('key').primary();
        table.jsonb('config');
        table.timestamps(false, true);
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable('config');
};
