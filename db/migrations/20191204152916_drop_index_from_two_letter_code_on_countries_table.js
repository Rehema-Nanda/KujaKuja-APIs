exports.up = async function (knex) {
    // drop existing index from iso_two_letter_code column in countries table
    await knex.schema.table('countries', function (table) {
        table.dropIndex(['iso_two_letter_code'], 'index_countries_on_iso_two_letter_code');
    });
};

exports.down = async function (knex) {
    await knex.schema.table('countries', function (table) {
        table.index(['iso_two_letter_code'], 'index_countries_on_iso_two_letter_code');
    });
};
