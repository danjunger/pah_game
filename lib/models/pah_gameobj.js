'use strict';

var without = require('../util/without');

function PAHGameObj () {
  this.hand = [];
  this.victoryCards = [];
}

PAHGameObj.prototype.addCard = function(card) {
  this.hand.push(card);
};

PAHGameObj.prototype.removeCard = function(card) {
  this.hand = without(this.hand, card);
};

PAHGameObj.prototype.reset = function() {
	this.hand = [];
	this.victoryCards = [];
};

PAHGameObj.prototype.addVictoryCard = function(victryCard) {
	this.victoryCards.push(victryCard);
};

module.exports = PAHGameObj;
