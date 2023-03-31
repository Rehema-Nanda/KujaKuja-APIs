'use strict';

const _ = require('lodash');

let post = {
    "type": "object",
    "properties": {
        "id": {
            "disallow": "any"
        },
        "name": {
            "type": "string",
            "required": true
        },
        "enabled": {
            "type": "boolean"
        },
        "iso_two_letter_code": {
            "type": "string"
        },
        "geojson": {
            "type": "string"
        },
        "lat": {
            "type": ["number", "string"],
            "required": true
        },
        "lng": {
            "type": ["number", "string"],
            "required": true
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        },
        "updated_at": {
            "type": "string",
            "format": "date-time"
        }
    }
};

let put = _.cloneDeep(post);
put.properties.name.required = false;
put.properties.lat.required = false;
put.properties.lng.required = false;
put.properties.created_at = {"disallow": "any"}; // don't allow created_at to be set on PUT

let schema = {
    post: post,
    put: put
};

module.exports = schema;
