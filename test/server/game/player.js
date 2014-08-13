'use strict';

var should = require('should'),
    Player = require('../../../server/models/player');
var assert = require('assert');

describe('Player class', function() {
  beforeEach(function(){
    var testPlayer = new Player('Name1','socket123');
    this.testPlayer = testPlayer;
  });

  it('should create a new player object', function() {
    var testPlayer = this.testPlayer;

    assert.equal(testPlayer.name, 'Name1');
    assert.equal(testPlayer.socketId, 'socket123');
    assert.equal(testPlayer.id.length, 10);
    assert.equal(testPlayer.gameId, 0);
    assert.equal(typeof testPlayer.gameObj, 'object');
  });

  it('should return minimum player info', function() {
    var testPlayer = this.testPlayer;
    var minPlayer = testPlayer.minimumUser();

    assert.equal(minPlayer.name, 'Name1');

    var keys = Object.keys(minPlayer);
    assert.equal(keys.length, 2);
    assert.notEqual(keys.indexOf('id'), -1);
    assert.equal(keys.indexOf('socketId'), -1);
    assert.equal(keys.indexOf('gameObj'), -1);
    assert.equal(keys.indexOf('gameId'), -1);
  });

});
