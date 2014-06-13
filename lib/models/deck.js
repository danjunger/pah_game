'use strict';

var _ = require('underscore');

function Deck (cardSet) {
  this.undrawn = cardSet;
  this.discarded = [];
  this.playercards = [];
}

var shuffleIt = function(array) {
  for (var i = 0; i < array.length; i++) {
    var tmp = array[i];
    var swapIndex = _.random(array.length - 1);
    array[i] = array[swapIndex];
    array[swapIndex] = tmp;
  }
};

Deck.prototype.shuffle = function(numShuffles) {
  numShuffles = numShuffles || 3;

  // get all the cards
  this.undrawn = this.undrawn.concat(this.discarded, this.playercards);
  this.discarded = [];
  this.playercards = [];

  for (var i = 0; i < numShuffles; i++) {
    shuffleIt(this.undrawn);
  }
};

Deck.prototype.shuffleDiscard = function(numShuffles) {
  numShuffles = numShuffles || 3;

  // get all the discarded cards
  this.undrawn = this.undrawn.concat(this.discarded);
  this.discarded = [];

  for (var i = 0; i < numShuffles; i++) {
    shuffleIt(this.undrawn);
  }
};

Deck.prototype.draw = function() {
  var card;
  if (this.undrawn.length > 0) {
    card = this.undrawn.pop();
    this.playercards.push(card);
  }
  else {
    if (this.discarded.length > 0) {
      this.shuffleDiscard();
      card = this.draw();
    }
  }
  return card;
};

Deck.prototype.next = function() {
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
  return card;
};

Deck.prototype.discard = function(card) {
  this.playercards = _.without(this.playercards, card);
  this.discarded.push(card);
};

Deck.prototype.canDraw = function() {
  if (this.undrawn.length > 0 || this.discarded.length > 0) {
    return true;
  }
  else {
    return false;
  }
};

module.exports = Deck;
