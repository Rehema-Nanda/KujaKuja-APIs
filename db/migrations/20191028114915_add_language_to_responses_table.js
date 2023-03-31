
exports.up = async function(knex) {
    await knex.schema.table('responses', function (table) {
        table.string('idea_language', 128).defaultTo((process.env.IDEAS_LANGUAGE || 'en').trim().toLowerCase());
    });
};

exports.down = async function(knex) {
    await knex.schema.table('responses', function (table) {
        table.dropColumn('idea_language');
    });
};
