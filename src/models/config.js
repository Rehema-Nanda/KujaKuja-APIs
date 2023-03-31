'use strict';

let site_header = {
    put: {
        "$schema": "http://json-schema.org/schema#",
        "id": "http://kujakuja.com/schemas/site_header.json",
        "type": "object",
        "required": [
            "config",
            "updated_at"
        ],
        "properties": {
            "key": {
                "disallow": "any"
            },
            "config": {
                "type": "object",
                "required": [
                    "favicon_url",
                    "logo_url",
                    "title_text",
                    "highlight_colour"
                ],
                "properties": {
                    "favicon_url": {"type": ["null", "string"]},
                    "logo_url": {"type": ["null", "string"]},
                    "title_text": {"type": ["null", "string"]},
                    "highlight_colour": {"type": ["null", "string"]}
                }
            },
            "updated_at": {
                "type": "string",
                "format": "date-time"
            },
        }
    }
};

let schema = {
    site_header: site_header
};

module.exports = schema;
