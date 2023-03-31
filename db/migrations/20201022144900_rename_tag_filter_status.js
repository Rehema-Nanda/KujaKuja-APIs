
exports.up = async function(knex) {
    await knex.raw(`UPDATE tag_filters SET status = 'EDITING' WHERE status = 'DISABLED'`);
    await knex.raw(`UPDATE tag_filters SET status = 'ACTIVE' WHERE status = 'APPLIED'`);
    await knex.raw(`ALTER TABLE tag_filters ALTER COLUMN status SET DEFAULT 'EDITING'`);
};

exports.down = async function(knex) {
    await knex.raw(`UPDATE tag_filters SET status = 'DISABLED' WHERE status = 'EDITING'`);
    await knex.raw(`UPDATE tag_filters SET status = 'APPLIED' WHERE status = 'ACTIVE'`);
    await knex.raw(`ALTER TABLE tag_filters ALTER COLUMN status SET DEFAULT 'DISABLED'`);
};
