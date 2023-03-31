const BaseModel = require('./base_model');

class GCloudNLAPIResponse extends BaseModel {
    static get tableName() {
        return 'gcloud_nl_api_responses';
    }

    static get jsonSchema () {
        return {
            "$schema": "http://json-schema.org/schema#",
            "id": "http://kujakuja.com/schemas/gcloud_nl_api_response.json",
            "type": "object",
            "required": [
                "analysis_type",
                // "created_at", // has a default in the DB
                // "response_id" // $relatedQuery doesn't handle validation well
            ],
            "properties": {
                "id": {"type": "integer", "readOnly": true},
                "analysis_type": {"type": "string", "pattern": "^(entities|sentiment|syntax|entity-sentiment|multi)$"},
                "created_at": {"type": "string", "format": "date-time"},
                "response_id": {"type": "integer"},
                "api_response": {"type": "array"}
            }
        }
    }

    static get relationMappings() {
        // http://vincit.github.io/objection.js/#models

        // Import models here to prevent require loops.
        const Response = require('./response');

        return {
            response: {
                relation: this.BelongsToOneRelation,
                modelClass: Response,
                join: {
                    from: 'gcloud_nl_api_responses.response_id',
                    to: 'responses.id'
                }
            }
        };
    }
}

module.exports = GCloudNLAPIResponse;
