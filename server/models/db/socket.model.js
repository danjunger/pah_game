'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var states = 'connected disconnected'.split(' ')

var SocketSchema = new Schema({
  socketId: String,
  verified: Boolean,
  state: { type: String, enum: states }
});

module.exports = mongoose.model('Socket', SocketSchema);
