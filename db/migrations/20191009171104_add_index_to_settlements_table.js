
exports.up = async function(knex) {
    // create index on name column
    // rename foreign key on country_id column
    await knex.schema.table('settlements', function (table) {
        table.index(['name'], 'index_settlements_on_name');

        table.dropForeign(['country_id'], 'fk_rails_bca4ce09e0');
        table.foreign('country_id',  'settlements_country_id_foreign')
            .references('id')
            .inTable('countries');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('settlements', function (table) {
        table.dropIndex(['name'], 'index_settlements_on_name');

        table.dropForeign(['country_id'], 'settlements_country_id_foreign');
        table.foreign('country_id',  'fk_rails_bca4ce09e0')
            .references('id')
            .inTable('countries');
    });
};
