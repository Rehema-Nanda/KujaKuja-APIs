exports.up = async function (knex) {
    // create unique index on iso_two_letter_code in countries table
    await knex.schema.table('countries', function (table) {
        table.unique(['iso_two_letter_code'], 'unique_index_countries_on_iso_two_letter_code');
    });
};

exports.down = async function (knex) {
    await knex.schema.table('countries', function (table) {
        table.dropUnique(['iso_two_letter_code'], 'unique_index_countries_on_iso_two_letter_code');
    });
};
