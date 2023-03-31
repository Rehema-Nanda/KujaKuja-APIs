
exports.up = async function(knex) {

    const ideasLanguage = (process.env.IDEAS_LANGUAGE || 'en').trim().toLowerCase();
    let vectorLanguage = 'pg_catalog.english';
    switch(ideasLanguage){
        case 'es':
            vectorLanguage = 'pg_catalog.spanish';
            break;
        case 'fr':
            vectorLanguage = 'pg_catalog.french';
            break;
        default:
            break;
    }

    await knex.raw(`ALTER TABLE responses ADD COLUMN idea_token_vector tsvector;`);
    await knex.raw(`UPDATE responses SET idea_token_vector = to_tsvector('${vectorLanguage}', idea) 
    WHERE responses.idea != 'none' AND COALESCE(TRIM(responses.idea), '') != '';`);
    await knex.raw(`CREATE INDEX index_responses_on_idea ON responses USING GIN (idea_token_vector);`);

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

    await knex.raw(`CREATE TRIGGER trigger_responses_idea_tsvector 
    BEFORE INSERT OR UPDATE ON responses FOR EACH ROW EXECUTE PROCEDURE set_responses_idea_tsvector();`);

};

exports.down = async function(knex) {

    await knex.raw(`DROP TRIGGER IF EXISTS trigger_responses_idea_tsvector ON responses;`);
    await knex.raw(`DROP FUNCTION IF EXISTS set_responses_idea_tsvector;`);

    await knex.schema.table('responses', function (table) {
        table.dropIndex(['idea_token_vector'], 'index_responses_on_idea');
        table.dropColumn('idea_token_vector');
    });


};
