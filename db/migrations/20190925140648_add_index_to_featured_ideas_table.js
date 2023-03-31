exports.up = async (knex) => {
    // create index on created_at column
    // rename foreign key on settlement_id column
    await knex.schema.table('featured_ideas', function (table) {
        table.index(['created_at'], 'index_featured_ideas_on_created_at');

        table.dropForeign(['settlement_id'], 'fk_rails_2c474859e2');
        table.foreign('settlement_id',  'featured_ideas_settlement_id_foreign')
            .references('id')
            .inTable('settlements');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('featured_ideas', function (table) {
        table.dropIndex(['created_at'], 'index_featured_ideas_on_created_at');

        table.dropForeign(['settlement_id'], 'featured_ideas_settlement_id_foreign');
        table.foreign('settlement_id',  'fk_rails_2c474859e2')
            .references('id')
            .inTable('settlements');
    });
};
