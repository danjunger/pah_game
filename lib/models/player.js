'use strict';

var randomString = require('random-string');
var PAHGameObj = require('./pah_gameobj');

function Player (name, socketid) {
  // public properties
  this.name = name;
  this.id = randomString({length: 10});

  // private properties
  this.socketId = socketid;
  this.gameId = 0;
  this.gameObj = new PAHGameObj();
  //this.chatObj = new ChatObj();
}

Player.prototype.minimumUser = function() {
	return {name: this.name, id: this.id};
};

module.exports = Player;
