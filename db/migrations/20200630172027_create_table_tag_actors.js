exports.up = async function(knex) {
    await knex.schema.createTable("tag_actors", (table) => {
        table.increments();
        table.string("actor_entity_type").notNullable();
        table.biginteger("actor_entity_id");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable("tag_actors");
};
