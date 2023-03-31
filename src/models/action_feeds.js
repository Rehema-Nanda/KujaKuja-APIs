const _ = require("lodash");

const post = {
    type: "object",
    properties: {
        id: {
            disallow: "any",
        },
        title: {
            type: "string",
            required: true,
        },
        description: {
            type: "string",
            required: true,
        },
        settlement_id: {
            type: ["number", "string"],
        },
        implementor: {
            type: "string",
        },
        numbers: {
            type: "string",
        },
        service_type_id: {
            type: ["number", "string"],
        },
        source: {
            type: "string",
        },
        tag: {
            type: "string",
        },
        image: {
            type: "string",
        },
        time: {
            type: "string",
            format: "date",
        },
        created_at: {
            type: "string",
            format: "date-time",
        },
        updated_at: {
            type: "string",
            format: "date-time",
        },
    },
};

let put = _.cloneDeep(post);
put.properties.title.required = true;
put.properties.description.required = true;
put.properties.created_at = {"disallow": "any"}; // don't allow created_at to be set on PUT

const schema = {
    post: post,
    put: post,
};

module.exports = schema;
