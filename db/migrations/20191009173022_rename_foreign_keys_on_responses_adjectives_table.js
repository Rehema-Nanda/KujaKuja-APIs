
exports.up = async function(knex) {
    // rename foreign keys on adjective_id & response_id columns
    await knex.schema.table('responses_adjectives', function (table) {
        table.dropForeign(['adjective_id'], 'fk_rails_33559f6bf2');
        table.foreign('adjective_id',  'responses_adjectives_adjective_id_foreign')
            .references('id')
            .inTable('adjectives');

        table.dropForeign(['response_id'], 'fk_rails_aa8513d782');
        table.foreign('response_id',  'responses_adjectives_response_id_foreign')
            .references('id')
            .inTable('responses');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('responses_adjectives', function (table) {
        table.dropForeign(['adjective_id'], 'responses_adjectives_adjective_id_foreign');
        table.foreign('adjective_id',  'fk_rails_33559f6bf2')
            .references('id')
            .inTable('adjectives');

        table.dropForeign(['response_id'], 'responses_adjectives_response_id_foreign');
        table.foreign('response_id',  'fk_rails_aa8513d782')
            .references('id')
            .inTable('responses');
    });
};
