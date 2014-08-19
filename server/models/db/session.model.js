'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('./user.model');

var SessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  token: String,
  socket: { type: Schema.Types.ObjectId, ref: 'Socket' },
  date: { type: Date, default: Date.now },
  gameState: { type: Schema.Types.ObjectId, ref: 'UserGameState' }
});


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

// Validate user exists in DB
SessionSchema
  .path('user')
  .validate(function(value, respond) {
    var self = this;
    User.findById(value._id, function(err, u) {
      if(err) throw err;
      if(u) {
        if(self.username === u.username) return respond(true);
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

module.exports = mongoose.model('Session2', SessionSchema);
