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

let schema = {
    post: post,
    put: put
};

module.exports = schema;
