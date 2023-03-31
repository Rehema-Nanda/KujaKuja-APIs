exports.up = async function (knex) {
    await knex.schema.createTable("api_stats", (table) => {
        table.increments();
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now())
            .index("index_api_stats_on_created_at");
        table.string("method").notNullable().index("index_api_stats_on_method");
        table.string("path").notNullable().index("index_api_stats_on_path");
        table.string("ip").notNullable();
        table.string("referrer").index("index_api_stats_on_referrer");
        table.string("country");
        table.string("region");
        table.string("city");
        table.string("city_coords");
        table.string("related_entity_type").index("index_api_stats_on_related_entity_type");
        table.bigInteger("related_entity_id").index("index_api_stats_on_related_entity_id");
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable("api_stats");
};
