'use strict';

var should = require('should');
var Game = require('../../../server/models/game');
var Player = require('../../../server/models/player');
var assert = require('assert');

describe('Game class', function() {
  beforeEach(function(){
    var testGame = new Game();
    this.testGame = testGame;
  });

  it('should create a new Game object', function() {
    var testGame = this.testGame;

    assert.equal(testGame.players.length, 0);
    assert.equal(testGame.id.length, 4);
    assert.equal(typeof testGame.game_board, 'object');
    assert.equal(testGame.currentPlayerTurn, 0);
  });

  it('should add a player to a Game object', function() {
    var testGame = this.testGame;

    var testPlayer1 = new Player('name1', 'socket1');
    var testPlayer2 = new Player('name2', 'socket2');

    testGame.addPlayer(testPlayer1);
    testGame.addPlayer(testPlayer2);

    assert.equal(testGame.players.length, 2);
    assert.equal(typeof testGame.players[0], 'object');
    assert.equal(typeof testGame.players[1], 'object');
  });

  it('should remove a player from a Game object', function() {
    var testGame = this.testGame;

    var testPlayer1 = new Player('name1', 'socket1');
    var testPlayer2 = new Player('name2', 'socket2');

    testGame.addPlayer(testPlayer1);
    testGame.addPlayer(testPlayer2);

    assert.equal(testGame.players.length, 2);
    assert.equal(typeof testGame.players[0], 'object');
    assert.equal(typeof testGame.players[1], 'object');

    testGame.removePlayer(testPlayer1);
    assert.equal(testGame.players.length, 1);
    assert.equal(testGame.players[0].name, 'name2');

    testGame.removePlayer(testPlayer1);
    assert.equal(testGame.players.length, 1);    

    testGame.removePlayer(testPlayer2);
    assert.equal(testGame.players.length, 0);
  });

  it('should get the next player for a new turn', function() {
    var testGame = this.testGame;

    var testPlayer1 = new Player('name1', 'socket1');
    var testPlayer2 = new Player('name2', 'socket2');

    testGame.addPlayer(testPlayer1);
    testGame.addPlayer(testPlayer2);

    assert.equal(testGame.currentPlayerTurn, 0);
    testGame.nextTurn();
    assert.equal(testGame.currentPlayerTurn, 1);
    testGame.nextTurn();
    assert.equal(testGame.currentPlayerTurn, 0);
  });

  it('should get the player whose turn it is', function() {
    var testGame = this.testGame;

    var testPlayer1 = new Player('name1', 'socket1');
    var testPlayer2 = new Player('name2', 'socket2');

    testGame.addPlayer(testPlayer1);
    testGame.addPlayer(testPlayer2);

    var playerWhoseTurn = testGame.getPlayerForTurn();
    assert.equal(playerWhoseTurn, testPlayer1);
  });

  it('should choose a random player', function() {
    var testGame = this.testGame;

    var testPlayer1 = new Player('name1', 'socket1');
    var testPlayer2 = new Player('name2', 'socket2');
    var testPlayer3 = new Player('name3', 'socket3');
    var testPlayer4 = new Player('name4', 'socket4');

    testGame.addPlayer(testPlayer1);
    testGame.addPlayer(testPlayer2);
    testGame.addPlayer(testPlayer3);
    testGame.addPlayer(testPlayer4);

    assert.equal(testGame.players.length, 4);

    testGame.chooseRandomPlayer();

    assert.equal(testGame.currentPlayerTurn >= 0 && testGame.currentPlayerTurn < testGame.players.length, true);
  });

});