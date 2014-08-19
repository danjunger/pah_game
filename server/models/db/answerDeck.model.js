'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Answer = require('./answer.model');
var DeckMethods = require('./deck.methods');

var AnswerDeckSchema = new Schema({
  undrawn: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  discarded: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  playerCards: [{ type: Schema.Types.ObjectId, ref: 'Answer' }]
});

AnswerDeckSchema.methods.initialize = DeckMethods.initializeMaker(Answer);
AnswerDeckSchema.methods.shuffle = DeckMethods.shuffle;
AnswerDeckSchema.methods.shuffleDiscard = DeckMethods.shuffleDiscard;
AnswerDeckSchema.methods.draw = DeckMethods.draw;
AnswerDeckSchema.methods.next = DeckMethods.next;
AnswerDeckSchema.methods.discard = DeckMethods.discard;
AnswerDeckSchema.methods.canDraw = DeckMethods.canDraw;

module.exports = mongoose.model('AnswerDeck', AnswerDeckSchema);
