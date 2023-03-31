
exports.up = async function(knex) {
    // create indexes on settlement_id & current_sign_in_at columns
    // rename foreign key on settlement_id column
    await knex.schema.table('users', function (table) {
        table.index(['settlement_id'], 'index_users_on_settlement_id');
        table.index(['current_sign_in_at'], 'index_users_on_current_sign_in_at');

        table.dropForeign(['settlement_id'], 'fk_rails_236f55fae2');
        table.foreign('settlement_id',  'users_settlement_id_foreign')
            .references('id')
            .inTable('settlements');
    });
};

exports.down = async function(knex) {
    await knex.schema.table('users', function (table) {
        table.dropIndex(['settlement_id'], 'index_users_on_settlement_id');
        table.dropIndex(['current_sign_in_at'], 'index_users_on_current_sign_in_at');

        table.dropForeign(['settlement_id'], 'users_settlement_id_foreign');
        table.foreign('settlement_id',  'fk_rails_236f55fae2')
            .references('id')
            .inTable('settlements');
    });
};
