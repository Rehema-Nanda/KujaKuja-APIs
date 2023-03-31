
exports.up = async function(knex) {
    await knex.schema.table('action_feeds', function (table) {
        table.string('reporter');
        table.string('impact');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('action_feeds', function (table) {
        table.dropColumn('reporter');
        table.dropColumn('impact');
    });
};
