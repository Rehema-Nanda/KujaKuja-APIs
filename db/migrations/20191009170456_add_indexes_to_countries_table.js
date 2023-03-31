
exports.up = async function(knex) {
    // create indexes on enabled, name & iso_two_letter_code columns
    await knex.schema.table('countries', function (table) {
        table.index(['enabled'], 'index_countries_on_enabled');
        table.index(['name'], 'index_countries_on_name');
        table.index(['iso_two_letter_code'], 'index_countries_on_iso_two_letter_code');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('countries', function (table) {
        table.dropIndex(['enabled'], 'index_countries_on_enabled');
        table.dropIndex(['name'], 'index_countries_on_name');
        table.dropIndex(['iso_two_letter_code'], 'index_countries_on_iso_two_letter_code');
    });
};
