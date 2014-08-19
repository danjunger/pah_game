'use strict';

var _ = require('underscore');

var methods = {};

var handleError = function(err) {
  return err.toString();
};

methods.initializeMaker = function(sourceModel) {
  return function() {
    var deck = this;

    // populate an initially empty deck with data from the collection
    if (deck.undrawn.length === 0 && deck.discarded.length === 0 && deck.playerCards.length === 0) {
      sourceModel.find({}, function(err, data) {
        if (err) { 
          return handleError(err);
        }
        deck.undrawn = data;
        deck.populate('undrawn', function(err, data) {
          if (err) { 
            return handleError(err);
          }

          deck.shuffle();
          deck.save();
        });
      });
    }
    else {
      deck.populate('undrawn', function(err, data) {
        if (err) { 
          return handleError(err);
        }

        deck.save();
      });
    }
  };
};

var shuffleArray = function(array) {
  for (var i = 0; i < array.length; i++) {
    var tmp = array[i];
    var swapIndex = _.random(array.length - 1);
    array[i] = array[swapIndex];
    array[swapIndex] = tmp;
  }
};

methods.shuffle = function(numShuffles) {
  numShuffles = numShuffles || 3;

  // get all the cards
  this.undrawn = this.undrawn.concat(this.discarded, this.playerCards);
  this.discarded = [];
  this.playerCards = [];

  for (var i = 0; i < numShuffles; i++) {
    shuffleArray(this.undrawn);
  }
  this.save();
};


methods.shuffleDiscard = function(numShuffles) {
  numShuffles = numShuffles || 3;

  // get all the discarded cards
  this.undrawn = this.undrawn.concat(this.discarded);
  this.discarded = [];

  for (var i = 0; i < numShuffles; i++) {
    shuffleArray(this.undrawn);
  }
  this.save();
};

methods.draw = function() {
  var card;
  if (this.undrawn.length > 0) {
    card = this.undrawn.pop();
    this.playerCards.push(card);
  }
  else {
    if (this.discarded.length > 0) {
      this.shuffleDiscard();
      card = this.draw();
    }
  }
  this.save();
  return card;
};

methods.next = function() {
  var card;
  if (this.undrawn.length > 0) {
    card = this.undrawn.pop();
  }
  else {
    if (this.discarded.length > 0) {
      this.shuffleDiscard();
      card = this.next();
    }
  }
  this.save();
  return card;
};

methods.discard = function(card) {
  this.playerCards = _.without(this.playerCards, card);
  this.discarded.push(card);
  this.save();
};

methods.canDraw = function() {
  if (this.undrawn.length > 0 || this.discarded.length > 0) {
    return true;
  }
  else {
    return false;
  }
};


module.exports = methods;