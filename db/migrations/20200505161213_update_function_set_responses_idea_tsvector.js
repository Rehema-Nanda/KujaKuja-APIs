
exports.up = async function (knex) {
    await knex.raw(`CREATE OR REPLACE FUNCTION set_responses_idea_tsvector() RETURNS TRIGGER AS $$
    BEGIN
        IF COALESCE(TRIM(NEW.idea), '') = '' OR LOWER(NEW.idea) = 'none' THEN
            RETURN NEW;
        END IF;

        IF LOWER(NEW.idea_language) = 'es' THEN
            NEW.idea_token_vector := to_tsvector('pg_catalog.spanish', NEW.idea);
        ELSIF LOWER(NEW.idea_language) = 'fr' THEN
            NEW.idea_token_vector := to_tsvector('pg_catalog.french', NEW.idea);
        ELSIF LOWER(NEW.idea_language) = 'en' THEN
            NEW.idea_token_vector := to_tsvector('pg_catalog.english', NEW.idea);
        ELSE
            NEW.idea_token_vector := to_tsvector('pg_catalog.simple', NEW.idea);
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`);
};

exports.down = async function (knex) {
    await knex.raw(`CREATE OR REPLACE FUNCTION set_responses_idea_tsvector() RETURNS TRIGGER AS $$
    BEGIN
        IF COALESCE(TRIM(NEW.idea), '') = '' OR LOWER(NEW.idea) = 'none' THEN
            RETURN NEW;
        END IF;

        IF LOWER(NEW.idea_language) = 'es' THEN
            NEW.idea_token_vector := to_tsvector('pg_catalog.spanish', NEW.idea);
        ELSIF LOWER(NEW.idea_language) = 'fr' THEN
            NEW.idea_token_vector := to_tsvector('pg_catalog.french', NEW.idea);
        ELSE
            NEW.idea_token_vector := to_tsvector('pg_catalog.english', NEW.idea);
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`);
};
