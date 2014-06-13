var _ = require('underscore');
var randomString = require('random-string');
var GameBoard = require('./game_board');

function Game () {
  this.players = [];
  this.id = randomString({length: 5}).toLowerCase();
  this.game_board = new GameBoard();
  this.currentPlayerTurn = 0;
}

Game.prototype.addPlayer = function(player) {
  this.players.push(player);
};

Game.prototype.removePlayer = function(player) {
  this.players = _.without(this.players, player);

  // discard this player's cards as well so they get recycled
  var card;
  while (player.gameObj.hand.length > 0) {
    card = player.gameObj.hand.pop();
    this.game_board.answer_cards.discard(card);
  }
  
  while (player.gameObj.victoryCards.length > 0) {
    card = player.gameObj.victoryCards.pop();
    this.game_board.question_cards.discard(card);
  }
};

Game.prototype.nextTurn = function() {
  this.currentPlayerTurn++;
  if (this.currentPlayerTurn >= this.players.length) {
    this.currentPlayerTurn = 0;
  }
  this.game_board.nextRound();
};

Game.prototype.getPlayerForTurn = function() {
  return this.players[this.currentPlayerTurn];
};

Game.prototype.chooseRandomPlayer = function() {
  this.currentPlayerTurn = _.random(this.players.length - 1);
};

module.exports = Game;
