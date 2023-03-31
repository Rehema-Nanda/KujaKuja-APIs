'use strict';

const _ = require('lodash');

let schemaPost = {
    "type": "object",
    "properties": {
        "id": {
            "disallow": "any"
        },
        "name": {
            "type": "string",
            "required": true
        },
        "geojson": {
            "type": "string"
        },
        "lat": {
            "type": ["number", "string"]
        },
        "lng": {
            "type": ["number", "string"]
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        },
        "updated_at": {
            "type": "string",
            "format": "date-time"
        },
        "country_id": {
            "type": ["number", "string"],
            "required": true
        }
    }
};

let schemaPut = _.cloneDeep(schemaPost);
schemaPut.properties.name.required = false;
schemaPut.properties.country_id.required = false;
schemaPut.properties.created_at = {"disallow": "any"}; // don't allow created_at to be set on PUT

let schema = {
    post: schemaPost,
    put: schemaPut
};

module.exports = schema;
