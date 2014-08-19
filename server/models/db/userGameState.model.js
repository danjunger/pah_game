'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var states = 'authenticate join waitinglist choose waitforanswer answer scoreboard'.split(' ')

var UserGameStateSchema = new Schema({
  game: { type: Schema.Types.ObjectId, ref: 'Game' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  wins: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  cards: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  state: { type: String, enum: states }
});



module.exports = mongoose.model('UserGameState', UserGameStateSchema);
