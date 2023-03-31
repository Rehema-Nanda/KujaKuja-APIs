exports.up = async function (knex) {
    await knex.schema.createTable("action_feeds", (table) => {
        table.increments();
        table.string("title").notNullable();
        table.text("description").notNullable();
        table.bigInteger("settlement_id").index("index_action_feeds_on_settlement_id");
        table.foreign("settlement_id").references("settlements.id").onUpdate("NO ACTION").onDelete("NO ACTION");
        table.string("implementor");
        table.string("numbers");
        table.bigInteger("service_type_id").index("index_action_feeds_on_service_type_id");
        table.foreign("service_type_id").references("service_types.id").onUpdate("NO ACTION").onDelete("NO ACTION");
        table.string("source");
        table.string("tag");
        table.timestamp("time");
        table.string("image");
        table.string("action_feed_language", 128).defaultTo((process.env.ACTION_FEED_LANGUAGE || "en").trim().toLowerCase());
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });

    const actionFeedLanguage = (process.env.ACTION_FEED_LANGUAGE || "en").trim().toLowerCase();

    let vectorLanguage = "pg_catalog.english";

    switch (actionFeedLanguage) {
        case "es":
            vectorLanguage = "pg_catalog.spanish";
            break;
        case "fr":
            vectorLanguage = "pg_catalog.french";
            break;
        default:
            break;
    }

    await knex.raw(`ALTER TABLE action_feeds ADD COLUMN action_feed_token_vector tsvector;`);
    await knex.raw(`UPDATE action_feeds SET action_feed_token_vector = to_tsvector('${vectorLanguage}', description) 
    WHERE action_feeds.description != 'none' AND COALESCE(TRIM(action_feeds.description), '') != '';`);
    await knex.raw(
        `CREATE INDEX index_action_feeds_on_description ON action_feeds USING GIN (action_feed_token_vector);`);

    await knex.raw(`CREATE OR REPLACE FUNCTION set_action_feed_description_tsvector() RETURNS TRIGGER AS $$
    BEGIN
        IF COALESCE(TRIM(NEW.description), '') = '' OR LOWER(NEW.description) = 'none' THEN
            RETURN NEW;
        END IF;
        
        IF LOWER(NEW.description) = 'es' THEN
            NEW.action_feed_token_vector := to_tsvector('pg_catalog.spanish', NEW.description);
        ELSIF LOWER(NEW.description) = 'fr' THEN
            NEW.description_token_vector := to_tsvector('pg_catalog.french', NEW.description); 
        ELSE
            NEW.action_feed_token_vector := to_tsvector('pg_catalog.english', NEW.description);        
        END IF;
           
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`);

    await knex.raw(`CREATE TRIGGER trigger_action_feed_description_tsvector 
    BEFORE INSERT OR UPDATE ON action_feeds FOR EACH ROW EXECUTE PROCEDURE set_action_feed_description_tsvector();`);
};

exports.down = async function (knex) {
    await knex.raw(`DROP TRIGGER IF EXISTS trigger_action_feed_description_tsvector ON action_feeds;`);
    await knex.raw(`DROP FUNCTION IF EXISTS set_action_feed_description_tsvector;`);
    await knex.schema.dropTable("action_feeds");
};
