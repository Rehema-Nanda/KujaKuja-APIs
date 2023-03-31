exports.up = async function (knex) {
    await knex.schema.table("tag_actors", (table) => {
        table.index(["actor_entity_id"], "index_tag_actors_on_actor_entity_id");
    });
    await knex.schema.table("tag_provenance", (table) => {
        table.index(["tag_actor_id"], "index_tag_provenance_on_tag_actor_id");
    });
};

exports.down = async function (knex) {
    await knex.schema.table("tag_actors", (table) => {
        table.dropIndex(["actor_entity_id"], "index_tag_actors_on_actor_entity_id");
    });
    await knex.schema.table("tag_provenance", (table) => {
        table.dropIndex(["tag_actor_id"], "index_tag_provenance_on_tag_actor_id");
    });
};
