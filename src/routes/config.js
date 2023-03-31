const debug = require("debug")("kk:config");
const express = require("express");

const router = express.Router();
const _ = require("lodash");
const moment = require("moment");
const multer = require("multer");

const upload = multer();
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GCP_LOCATION;

const cloudStorage = require("@google-cloud/storage");

const cloudStorageClient = new cloudStorage.Storage({ projectId: projectId });

const jsonschema = require("jsonschema");
const knex = require("../knex");
const schema = require("../models/config");

const {
    InvalidParamsError,
    InsufficientPermissionsError,
    errorHandler,
} = require("../utils/errorHandler");

// GET /
// Description: Get all configuration options
router.get("/", async (req, res) => {
    try {
        const config = await getConfig();
        res.status(200).json(config);
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

// PUT /site_header
// Description: Update site_header configuration
// Ref: https://programmingwithmosh.com/javascript/react-file-upload-proper-server-side-nodejs-easy/
const uploadFields = upload.fields([{ name: "favicon", maxCount: 1 }, { name: "logo", maxCount: 1 }]); // https://github.com/expressjs/multer
router.put("/site_header", uploadFields, async (req, res) => {
    try {
        if (_.isEmpty(req.body)) {
            throw new InvalidParamsError("Update site_header config", "Missing data");
        }

        if (!req.user.is_admin) {
            throw new InsufficientPermissionsError("Update site_header config");
        }
        // acquire public GCS bucket to store uploaded files in
        const bucket = await acquirePublicGoogleCloudStorageBucket();

        // upload files to GCS bucket
        const fileUrls = await uploadFilesToGoogleCloudStorageBucket(bucket, req.files);

        // **TODO: check if we can update JSON values individually through knex
        const config = await getConfig();
        const siteHeader = config.site_header;

        // update 'site_header' entry in 'config' table
        const siteHeaderConfig = {
            updated_at: moment().format(),
            config: {
                favicon_url: siteHeader.favicon_url,
                logo_url: siteHeader.logo_url,
                title_text: req.body.title_text,
                highlight_colour: req.body.highlight_colour,
            },
        };

        if (fileUrls && fileUrls.favicon) {
            siteHeaderConfig.config.favicon_url = fileUrls.favicon;
        }
        if (fileUrls && fileUrls.logo) {
            siteHeaderConfig.config.logo_url = fileUrls.logo;
        }

        const validationResult = jsonschema.validate(siteHeaderConfig, schema.site_header.put);

        if (!validationResult.valid) {
            throw new InvalidParamsError("Update site_header config", validationResult.errors);
        }

        await knex("config").where("key", "site_header").update(siteHeaderConfig);

        res.status(200).json({ state: "updated" });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

const getConfig = async () => {
    const results = await knex("config").select();
    const config = {};

    // eslint-disable-next-line no-restricted-syntax
    for (const row of results) {
        config[row.key] = row.config;
    }

    return config;
};

const getMultiRegionalLocationName = function(location) {
    // https://cloud.google.com/storage/docs/locations
    location = location.toLowerCase();

    if (location.startsWith("us") || location.startsWith("northamerica") || location.startsWith("southamerica")) {
        return "us";
    }

    if (location.startsWith("europe")) {
        return "eu";
    }

    if (location.startsWith("asia") || location.startsWith("australia")) {
        return "asia";
    }

    throw new Error(`Unrecognised location name: ${location}`);
};

const acquirePublicGoogleCloudStorageBucket = async () => {
    // https://cloud.google.com/nodejs/docs/reference/storage/2.3.x/
    // https://cloud.google.com/storage/docs/json_api/v1/buckets/insert

    const response = await cloudStorageClient.bucket(`${projectId}-public`).get(
        {
            autoCreate: true,
            location: getMultiRegionalLocationName(location),
            defaultObjectAcl: [
                {
                    entity: "allUsers",
                    role: "READER",
                },
            ],
        },
    );
    return response[0];
};

const uploadFilesToGoogleCloudStorageBucket = async (bucket, files) => {
    // https://cloud.google.com/nodejs/docs/reference/storage/2.3.x/
    // https://cloud.google.com/storage/docs/json_api/v1/objects/insert

    const fileUrls = {};

    // upload each file
    for (const key in files) {
        // even though files (req.files in the handler) is an object, it doesn't have the hasOwnProperty function
        // if (files.hasOwnProperty(key)) {
        //     continue;
        // }

        const fileName = files[key][0].originalname;
        const mimeType = files[key][0].mimetype;
        const buffer = files[key][0].buffer;

        const gcsFile = bucket.file(fileName);
        await gcsFile.save(buffer, {resumable: false, contentType: mimeType});
        fileUrls[key] = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    return fileUrls;
};

module.exports = router;
