exports.up = async function (knex) {
    // create unique index on response_id and name columns in tags table
    await knex.schema.table("tags", function (table) {
        table.unique(["response_id", "name"], "unique_index_tags_on_response_id_and_name");
    });
};

exports.down = async function (knex) {
    await knex.schema.table("tags", function (table) {
        table.dropUnique(["response_id", "name"], "unique_index_tags_on_response_id_and_name");
    });
};
