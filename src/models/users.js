'use strict';

const _ = require('lodash');

let post = {
    "type": "object",
    "properties": {
        "id": {
            "disallow": "any"
        },
        "email": {
            "type": "string",
            "required": true,
            "format": "email"
        },
        "encrypted_password": {
            "type": "string"
        },
        "reset_password_token": {
            "type": "string"
        },
        "reset_password_sent_at": {
            "type": "string",
            "format": "date-time"
        },
        "remember_created_at": {
            "type": "string",
            "format": "date-time"
        },
        "sign_in_count": {
            "type": ["number", "string"],
        },
        "current_sign_in_at": {
            "type": "string",
            "format": "date-time"
        },
        "last_sign_in_at": {
            "type": "string",
            "format": "date-time"
        },
        "current_sign_in_ip": {
            "type": ["number", "string"],
        },
        "last_sign_in_ip": {
            "type": ["number", "string"],
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        },
        "updated_at": {
            "type": "string",
            "format": "date-time"
        },
        "is_admin": {
            "type": "boolean",
            "required": true
        },
        "provider": {
            "type": "string",
        },
        "uid": {
            "type": "string",
        },
        "tokens": {
            "type": "string",
        },
        "settlement_id": {
            "type": ["number", "string"],
            "required": true
        },
        "is_survey": {
            "type": "boolean",
            "required": true
        },
        "is_service_provider": {
            "type": "boolean",
            "required": true
        }
    }
};

let put = _.cloneDeep(post);
put.properties.email.required = false;

let schema = {
    post: post,
    put: put
};

module.exports = schema;
