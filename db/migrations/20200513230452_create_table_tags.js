
exports.up = async function(knex) {
    await knex.schema.createTable("tags", (table) => {
        table.increments();
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.biginteger("response_id").notNullable().references("responses.id")
            .index("index_tags_on_response_id");
        table.string("name").notNullable().index("index_tags_on_name");
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable("tags");
};
