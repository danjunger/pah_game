'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Question = require('./question.model');
var DeckMethods = require('./deck.methods');

var QuestionDeckSchema = new Schema({
  undrawn: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  discarded: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  playerCards: [{ type: Schema.Types.ObjectId, ref: 'Question' }]
});

QuestionDeckSchema.methods.initialize = DeckMethods.initializeMaker(Question);
QuestionDeckSchema.methods.shuffle = DeckMethods.shuffle;
QuestionDeckSchema.methods.shuffleDiscard = DeckMethods.shuffleDiscard;
QuestionDeckSchema.methods.draw = DeckMethods.draw;
QuestionDeckSchema.methods.next = DeckMethods.next;
QuestionDeckSchema.methods.discard = DeckMethods.discard;
QuestionDeckSchema.methods.canDraw = DeckMethods.canDraw;

module.exports = mongoose.model('QuestionDeck', QuestionDeckSchema);
