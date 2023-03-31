const BaseModel = require('./base_model');

class Adjective extends BaseModel {
    static get tableName() {
        return 'adjectives';
    }

    static get jsonSchema () {
        return {
            "$schema": "http://json-schema.org/schema#",
            "id": "http://kujakuja.com/schemas/adjective.json",
            "type": "object",
            "required": [
                "name"
            ],
            "properties": {
                "id": {"type": "integer", "readOnly": true},
                "name": {"type": "string"}
            }
        }
    }

    static get relationMappings() {
        // http://vincit.github.io/objection.js/#models

        // Import models here to prevent require loops.
        const Response = require('./response');
        const ResponseAdjective = require('./response_adjective');

        return {
            responses: {
                relation: this.ManyToManyRelation,
                modelClass: Response,
                join: {
                    from: 'adjectives.id',
                    through: {
                        modelClass: ResponseAdjective,
                        from: 'responses_adjectives.adjective_id',
                        to: 'responses_adjectives.response_id',
                        extra: ['count']
                    },
                    to: 'responses.id'
                }
            }
        };
    }
}

module.exports = Adjective;
