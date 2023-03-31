
exports.up = async function(knex) {
    await knex.raw(`ALTER TABLE action_feeds ALTER COLUMN impact TYPE TEXT`);
    await knex.raw(`ALTER TABLE action_feeds ALTER COLUMN image TYPE TEXT`);
};

exports.down = async function(knex) {
    await knex.raw(`ALTER TABLE action_feeds ALTER COLUMN impact TYPE VARCHAR(255)`);
    await knex.raw(`ALTER TABLE action_feeds ALTER COLUMN image TYPE VARCHAR(255)`);
};
