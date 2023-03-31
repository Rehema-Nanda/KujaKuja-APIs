
exports.up = async function(knex) {
    await knex.schema.createTable('gcloud_nl_api_responses', function (table) {
        table.increments();
        table.string('analysis_type').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.bigInteger('response_id').notNullable().index().references('responses.id').onUpdate('NO ACTION').onDelete('NO ACTION');
        table.jsonb('api_response');
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable('gcloud_nl_api_responses');
};
