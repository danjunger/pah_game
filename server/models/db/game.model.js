'use strict';

var mongoose = require('mongoose'),
    Q = require('q'),
    Schema = mongoose.Schema,
    _ = require('underscore');

var AnswerDeck = require('./answerDeck.model'),
    QuestionDeck = require('./questionDeck.model'),
    UserGameState = require('./userGameState.model');

var GameSchema = new Schema({
  isStarted: Boolean,
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  userGameStates: [{ type: Schema.Types.ObjectId, ref: 'UserGameState' }],
  userTurn: Number,
  question: { type: Schema.Types.ObjectId, ref: 'Question' },
  cardsToChoose: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  revealedCards: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  answer: {
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
    card: { type: Schema.Types.ObjectId, ref: 'Answer' }
  },
  answerDeck: { type: Schema.Types.ObjectId, ref: 'AnswerDeck' },
  questionDeck: { type: Schema.Types.ObjectId, ref: 'QuestionDeck' }
});

/**
 * Virtuals
 */
GameSchema.virtual('canStart').get(function() {
  return this.users.length >= 3;
});

GameSchema.virtual('canStartNextRound').get(function() {
  // if answer.winner is defined
  return !!(this.answer.winner);
});

GameSchema.virtual('waitingOnPlayers').get(function() {
  // TODO: here we could consider removing disconnected users from the count
  return (this.users.length - this.cardsToChoose.length);
});

GameSchema.virtual('scores').get(function() {
  return this.userGameStates.map(function(u) {
    return u.minimalUser();
  });
});


GameSchema.methods.addUser = function(user) {
  this.users.push(user);
  this.save();
};

GameSchema.methods.removeUser = function(user) {
  var currentUser = this.users[this.userTurn];
  this.users = _.without(this.users, user);

  // ensure the pointer to userTurn is adjusted 
  this.userTurn = this.users.indexOf(currentUser);

  var game = this;

  UserGameState.find({user: user}, function(err, userState) {
    // discard this user's cards as well so they get recycled
    var card;
    while (userState.cards.length > 0) {
      card = userState.cards.pop();
      game.answerDeck.discard(card);
    }
    
    while (userState.wins.length > 0) {
      card = userState.wins.pop();
      game.questionDeck.discard(card);
    }
  });


};

GameSchema.methods.nextTurn = function() {
  this.userTurn++;
  if (this.userTurn >= this.users.length) {
    this.userTurn = 0;
  }
  this.game_board.nextRound();
};

GameSchema.methods.getPlayerForTurn = function() {
  return this.users[this.userTurn];
};

GameSchema.methods.chooseRandomPlayer = function() {
  this.userTurn = _.random(this.users.length - 1);
};





GameSchema.statics.findAndPopulate = function(id) {
  var deferred = Q.defer();
  var G = this;
  G.findOne({_id: id})
    .populate('answerDeck questionDeck')
    .exec(function(err, doc) {
      if (!doc) {
        deferred.reject('Game not found.');
        return;
      }
      G.populate(doc, {path: 'undrawn playerCards discarded'}, function(err, data) {
        AnswerDeck.populate(doc.answerDeck, {path: 'undrawn playerCards discarded'}, function(err, d2) {
          QuestionDeck.populate(doc.questionDeck, {path: 'undrawn playerCards discarded'}, function(err, d2) {
            //console.log('draw:', doc.answerDeck.draw());
            //console.log('i dont know ', doc);
            deferred.resolve(doc);
          });
        });
      });
    });
  return deferred.promise;
};



module.exports = mongoose.model('Game', GameSchema);
