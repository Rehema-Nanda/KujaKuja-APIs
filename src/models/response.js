const BaseModel = require('./base_model');

class Response extends BaseModel {
    static get tableName() {
        return 'responses';
    }

    static get jsonSchema () {
        return {
            "$schema": "http://json-schema.org/schema#",
            "id": "http://kujakuja.com/schemas/response.json",
            "type": "object",
            "required": [
                "service_point_id",
                "satisfied",
                "lat",
                "lng",
                "created_at",
                "uploaded_at",
                "unique_id",
                "user_id"
            ],
            "properties": {
                "id": {"type": "integer", "readOnly": true},
                "service_point_id": {"type": "integer"},
                "satisfied": {"type": "boolean"},
                "idea": {"type": "string"},
                "lat": {"type": "number"},
                "lng": {"type": "number"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"},
                "uploaded_at": {"type": "string", "format": "date-time"},
                "unique_id": {"type": "string"},
                "user_id": {"type": "integer"},
                "response_type": {"type": "string"},
                "is_starred": {"type": "boolean"},
                "nlp_extract_adjectives_processed": {"type": "boolean"}
            }
        }
    }

    static get relationMappings() {
        // http://vincit.github.io/objection.js/#models

        // Import models here to prevent require loops.
        const Adjective = require('./adjective');
        const ResponseAdjective = require('./response_adjective');

        const GCloudNLAPIResponse = require('./gcloud_nl_api_response');

        return {
            adjectives: {
                relation: this.ManyToManyRelation,
                modelClass: Adjective,
                join: {
                    from: 'responses.id',
                    through: {
                        modelClass: ResponseAdjective,
                        from: 'responses_adjectives.response_id',
                        to: 'responses_adjectives.adjective_id',
                        extra: ['count']
                    },
                    to: 'adjectives.id'
                }
            },
            gcloud_nl_api_responses: {
                relation: this.HasManyRelation,
                modelClass: GCloudNLAPIResponse,
                join: {
                    from: 'responses.id',
                    to: 'gcloud_nl_api_responses.response_id'
                }
            }
        };
    }
}

module.exports = Response;
