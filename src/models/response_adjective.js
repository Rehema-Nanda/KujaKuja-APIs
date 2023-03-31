const BaseModel = require('./base_model');

class ResponseAdjective extends BaseModel {
    static get tableName() {
        return 'responses_adjectives';
    }

    static get jsonSchema () {
        return {
            "$schema": "http://json-schema.org/schema#",
            "id": "http://kujakuja.com/schemas/response_adjective.json",
            "type": "object",
            "required": [
                "adjective_id",
                "response_id",
                "count"
            ],
            "properties": {
                "adjective_id": {"type": "integer"},
                "response_id": {"type": "integer"},
                "count": {"type": "integer"}
            }
        }
    }

    static get relationMappings() {
        // http://vincit.github.io/objection.js/#models

        // Import models here to prevent require loops.
    }
}

module.exports = ResponseAdjective;
