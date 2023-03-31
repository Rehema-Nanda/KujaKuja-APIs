exports.up = async function(knex) {
    await knex.schema.createTable("tag_provenance", (table) => {
        table.increments();
        table.biginteger("tag_id").notNullable().references("tags.id");
        table.biginteger("tag_actor_id");
        table.string("action_uuid").notNullable();
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable("tag_provenance");
};
