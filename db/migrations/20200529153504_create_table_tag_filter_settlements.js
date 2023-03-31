exports.up = async function(knex) {
    await knex.schema.createTable("tag_filter_settlements", (table) => {
        table.increments();
        table.biginteger("tag_filter_id").notNullable().references("tag_filters.id")
            .index("index_tag_filter_settlements_on_tag_filter_id")
            .onUpdate("NO ACTION");
        table.biginteger("settlement_id").notNullable().references("settlements.id")
            .index("index_tag_filter_settlements_on_settlements_id")
            .onUpdate("NO ACTION");
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTable("tag_filter_settlements");
};
