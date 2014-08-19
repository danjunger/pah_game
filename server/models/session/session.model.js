'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('../../api/user/user.model');

var SessionSchema = new Schema({
  username: String,
  token: String,
  socketId: String,
  date: Date
});


// Validate empty username
SessionSchema
  .path('username')
  .validate(function(username) {
    return username.length;
  }, 'Username cannot be blank');

// Validate empty token
SessionSchema
  .path('token')
  .validate(function(token) {
    return token.length;
  }, 'Token cannot be blank');

// Validate empty date
SessionSchema
  .path('date')
  .validate(function(date) {
    return date;
  }, 'Date cannot be blank');

// Validate username exists in DB
SessionSchema
  .path('username')
  .validate(function(value, respond) {
    var self = this;
    User.findOne({username: value}, function(err, user) {
      if(err) throw err;
      if(user) {
        if(self.username === user.username) return respond(true);
        return respond(false);
      }
      respond(false);
    });
}, 'The specified username does not exist.');



/**
 * Methods
 */
SessionSchema.methods = {

};

module.exports = mongoose.model('Session', SessionSchema);
