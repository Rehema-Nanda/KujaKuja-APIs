exports.up = async(knex) => {
    await knex.schema.dropTableIfExists('active_admin_comments');
    await knex.schema.dropTableIfExists('ar_internal_metadata');
    await knex.schema.dropTableIfExists('delayed_jobs');
    await knex.schema.dropTableIfExists('pg_search_documents');
    await knex.schema.dropTableIfExists('schema_migrations');
};

exports.down = async function(knex) {
  
};
