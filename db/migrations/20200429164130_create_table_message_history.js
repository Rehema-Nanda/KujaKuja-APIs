exports.up = async function (knex) {
    await knex.schema.createTable("message_history", (table) => {
        table.increments();
        table.timestamp("created_at").notNullable().index("index_message_history_on_created_at").defaultTo(knex.fn.now());
        table.string("event").notNullable().index("index_message_history_on_event");
        table.string("source").notNullable().index("index_message_history_on_source");
        table.jsonb("source_detail");
        table.string("destination").notNullable().index("index_message_history_on_destination");
        table.jsonb("destination_detail");
        table.text("body").notNullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable("message_history");
};
