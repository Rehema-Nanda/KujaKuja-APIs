
exports.up = async function(knex) {
    await knex.schema.createTable("tag_filters", (table) => {
        table.increments();
        table.string("tag_text").notNullable();
        table.text("search_text").notNullable();
        table.timestamp("start_date");
        table.timestamp("end_date");
        table.string("status").notNullable().defaultTo("DISABLED");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
        table.timestamp("last_run_at");
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable("tag_filters");
};
