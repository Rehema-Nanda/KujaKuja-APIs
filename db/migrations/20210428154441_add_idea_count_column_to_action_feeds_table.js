
exports.up = async function(knex) {
    await knex.schema.table('action_feeds', function (table) {
        table.string('ideas_count');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('action_feeds', function (table) {
        table.dropColumn('ideas_count');
    });
};
