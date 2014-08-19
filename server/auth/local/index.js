'use strict';

var express = require('express');
var passport = require('passport');
var auth = require('../auth.service');
var Session = require('../../models/session/session.model');

var router = express.Router();

router.post('/', function(req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    var error = err || info;
    if (error) return res.json(401, error);
    if (!user) return res.json(404, {message: 'Something went wrong, please try again.'});

    var token = auth.signToken(user._id);
    res.json({token: token});
    req.session.token = token;

    var newSession = new Session({
      //user: user._id,
      username: user.username,
      token: token
    });
    newSession.save(function(err, session) {
      if (err) return res.json(401, validationError(res, err));
    });

  })(req, res, next)
});

module.exports = router;