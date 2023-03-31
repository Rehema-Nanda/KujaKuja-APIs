'use strict';

const debug = require('debug')('kk:passport');
const logger = require('./logging');

const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const passportJWT = require('passport-jwt');
const extractJwt = passportJWT.ExtractJwt;
const jwtStrategy = require('passport-jwt').Strategy;
const bcrypt = require('bcryptjs');
const knex = require('../knex');
const moment = require('moment');

const JWT_SECRET = process.env.JWT_SECRET;

function comparePassword( userPassword, databasePassword ) {
    return bcrypt.compareSync( userPassword, databasePassword );
}

passport.use('local', new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
    },
    function(email, password, done) {
        knex('users').where('email', email).first()
        .then( function (user) {
            if ( !user ) {
                debug('Incorrect email, no user object');
                return done (null, false, {msg: 'Incorrect email.'});
            }

            if ( !comparePassword( password, user.encrypted_password ) ) {
                debug('Bad password');
                return done (null, false, {msg: 'Authentication failed. Wrong password.'});
            } else {
                debug('Local authentication succeeded');
                let now = moment().format();
                knex('users').where('id', user.id).update({'last_sign_in_at': user.current_sign_in_at,'current_sign_in_at': now}).then( function (result) {
                    debug('Success updating sign in date');
                }).catch( function (err) {
                    debug('Error updating sign in date: ' + err);
                    logger.error(err);
                });
                return done (null, user);
            }
        })
        .catch( function (err) {
            debug('localAuthErr: ' + err);
            logger.error(err);
            return done (err);
        });
    })
);

passport.use('jwt', new jwtStrategy({
    jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
    }, 
    function(jwtPayload, done) {
        knex('users').where('email', jwtPayload.email).first()
        .then( function (user) {
            debug('JWT authentication succeeded');
            return done (null, user);
        })
        .catch( function (err) {
            debug('jwtAuthErr: ' + err);
            logger.error(err);
            return done (err);
        });
    })
);

module.exports = passport;
