const debug = require("debug")("kk:auth");

const express = require("express");

const router = express.Router();
// const passport = require('../config/passport');

const jwt = require("jsonwebtoken");

const { JWT_SECRET } = process.env;

// POST /login => authenticate login info
router.post("/login", (req, res) => {
    try {
        if (req.user) {
            const { user } = req;
            const token = jwt.sign({
                id: user.id,
                email: user.email,
                is_admin: user.is_admin,
                is_survey: user.is_survey,
                is_service_provider: user.is_service_provider,
                location: user.settlement_id,
            }, JWT_SECRET, { expiresIn: 3600 });
            res.status(200).json({ token: token });
        }
        else {
            res.status(401).end();
        }
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }

    // passport.authenticate('local', {session: false}, function (err, user, info) {
    //     debug('Local auth for /login');
    //     if (err) {
    //         return res.status(500).json({error: err});
    //     }
    //     if (!user) {
    //         return res.status(401).json({success: false, msg: 'Login Failed'});
    //     }
    //     if (user) {
    //         debug('Got somewhere');
    //         req.login(user, {session: false}, function (err) {
    //             if(err) {
    //                 return res.status(401).json({success: false, msg: err});
    //             } else {
    //                 var token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin, is_survey: user.is_survey, is_service_provider: user.is_service_provider }, JWT_SECRET, {
    //                     expiresIn: 60
    //                 });
    //                 return res.status(200).json({success: true, token: token});
    //             }
    //         });
    //     }
    // })(req, res);
});

// GET /refresh => get a refreshed TTL token
router.get("/refresh", (req, res) => {
    try {
        if (req.user) {
            const { user } = req;
            const token = jwt.sign({
                id: user.id,
                email: user.email,
                is_admin: user.is_admin,
                is_survey: user.is_survey,
                is_service_provider: user.is_service_provider,
                location: user.settlement_id,
            }, JWT_SECRET, { expiresIn: 3600 });
            res.status(200).json({ token: token });
        }
        else {
            res.status(401).end();
        }
    }
    catch (err) {
        debug(err);
        req.log.error(err);
        res.status(500).end();
    }
});

module.exports = router;
