'use strict';

const _ = require('lodash');

let post = {
    "type": "object",
    "properties": {
        "id": {
            "disallow": "any"
        },
        "service_type_id": {
            "type": ["number", "string"]
        },
        "settlement_id": {
            "type": ["number", "string"]
        },
        "name": {
            "type": "string",
            "required": true
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
        }
    }
};

let put = _.cloneDeep(post);
put.properties.name.required = false;
put.properties.created_at = {"disallow": "any"}; // don't allow created_at to be set on PUT

let availability_post = {
    "$schema": "http://json-schema.org/schema#",
    "id": "http://kujakuja.com/schemas/service_point_availability.json",
    "type": "object",
    "required": [
        "service_point_id",
        "available",
        "created_at",
        "uploaded_at"
    ],
    "properties": {
        "id": {"type": "integer", "readOnly": true},
        "service_point_id": {"type": "integer"},
        "available": {"type": "boolean"},
        "created_at": {"type": "string", "format": "date-time"},
        "uploaded_at": {"type": "string", "format": "date-time"},
        "availability_time": {"type": "string", "format": "date-time"},
        "unique_id": {"type": "string"}
    }
};

let schema = {
    post: post,
    put: put,
    availability_post: availability_post,
};

module.exports = schema;
