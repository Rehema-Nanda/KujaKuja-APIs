const _ = require("lodash");

const post = {
    type: "object",
    properties: {
        id: {
            disallow: "any",
        },
        tag_text: {
            type: "string",
            required: true,
        },
        search_text: {
            type: "string",
        },
        status: {
            type: "string",
        },
        start_date: {
            type: "string",
            format: "date",
        },
        end_date: {
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

const put = _.cloneDeep(post);
put.properties.tag_text.required = false;
put.properties.search_text.required = false;
put.properties.created_at = { disallow: "any" }; // don't allow created_at to be set on PUT

const schema = {
    post: post,
    put: put,
};

module.exports = schema;
