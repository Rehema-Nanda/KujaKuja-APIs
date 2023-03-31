'use strict';

const _ = require('lodash');

let post = {
    "type": "object",
    "properties": {
        "id": {
            "disallow": "any"
        },
        "idea": {
            "type": "string",
            "required": true
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        },
        "updated_at": {
            "type": "string",
            "format": "date-time"
        },
        "settlement_id": {
            "type": ["number", "string"],
            "required": true
        },
    }
};

let put = _.cloneDeep(post);
put.properties.idea.required = false;
put.properties.settlement_id.required = false;
put.properties.created_at = {"disallow": "any"}; // don't allow created_at to be set on PUT

let schema = {
    post: post,
    put: put
};

module.exports = schema;
