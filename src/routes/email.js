const express = require("express");

const router = express.Router();
const _ = require("lodash");
const sgMail = require("@sendgrid/mail");
const debug = require("debug")("kk:email");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { CONTACT_FORM_TO_ADDRESS, CONTACT_FORM_FROM_ADDRESS, CONTACT_FORM_SUBJECT } = process.env;
const {
    InvalidParamsError,
    errorHandler,
} = require("../utils/errorHandler");

// POST /email/contact_form
// Description: Sends an email for the contact form submission.
// @@ POST params @@
// email_address (string) : required
// organization (string) : optional
// message (string) : required
router.post("/contact_form", (req, res) => {
    try {
        if (_.isEmpty(req.body) || !req.body.email_address || !req.body.message) {
            throw new InvalidParamsError("Send contact form email", "Missing data");
        }

        const msg = {
            to: CONTACT_FORM_TO_ADDRESS,
            from: CONTACT_FORM_FROM_ADDRESS,
            replyTo: req.body.email_address,
            subject: CONTACT_FORM_SUBJECT,
            text: `Email Address: ${req.body.email_address}
            Organization: ${req.body.organization}
            Message: ${req.body.message}

            You can reply to this email directly`,
        };

        sgMail.send(msg).then(() => {
            res.status(200).json({});
        }).catch((error) => {
            debug(error);
            req.log.error(error);
            res.status(500).end();
        });
    }
    catch (error) {
        errorHandler(error, res, req);
    }
});

module.exports = router;
