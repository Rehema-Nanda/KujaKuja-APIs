exports.up = async function(knex) {
    await knex.raw(`CREATE OR REPLACE FUNCTION notify_tag_filter_table_change() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
    BEGIN
        PERFORM pg_notify('tag_filter_table_changed', TG_OP);
        RETURN NULL;
    END;
    $$;

    CREATE TRIGGER trigger_tag_filter_table_change AFTER INSERT OR UPDATE OR DELETE ON tag_filters
    FOR EACH ROW EXECUTE PROCEDURE notify_tag_filter_table_change();`);
};

exports.down = async function(knex) {
    await knex.raw(`DROP TRIGGER IF EXISTS trigger_tag_filter_table_change ON tag_filters;`);
    await knex.raw(`DROP FUNCTION IF EXISTS notify_tag_filter_table_change();`);
};
