'use strict';

/**
 * @ngdoc service
 * @name phonesAgainstHumanityApp.GameClient
 * @description
 * # Gameclient
 * Service in the phonesAgainstHumanityApp.
 */
angular.module('pah.client.GameClient', [])
  .service('GameClient', ['socket', '$cookies', function (socket, $cookies) {
    // store the ref to the GameClient for use inside socket callbacks
    var client = this;

    this.user = {};
    this.game = {};
    this.errors = {};
    this.authenticated = false;
    this.state = 'authenticate';

    this.resetHomeListeners = function() {
      socket.removeAllListeners('signInConfirm');
      socket.removeAllListeners('startConfirm');
      socket.removeAllListeners('joinConfirm');
    };

    this.resetGameListeners = function() {
      socket.removeAllListeners('gameCanStart');
      socket.removeAllListeners('gameStartConfirm');
      socket.removeAllListeners('playerUpdate');
      socket.removeAllListeners('cardDrawn');
      socket.removeAllListeners('submitCardReject');
      socket.removeAllListeners('submitCardConfirm');
      socket.removeAllListeners('yourTurnToChoose');
      socket.removeAllListeners('yourTurnToAnswer');
      socket.removeAllListeners('waitingForCards');
      socket.removeAllListeners('waitingForChooser');
      socket.removeAllListeners('chooseCard');
      socket.removeAllListeners('chooseConfirm');
      socket.removeAllListeners('cardChosen');
      socket.removeAllListeners('scoreUpdate');
      socket.removeAllListeners('startNextRoundPrompt');
      socket.removeAllListeners('roundStartConfirm');
    };

    // Home page listeners
    socket.on('signInConfirm', function(data) {
      client.user = data;
      client.errors = {};
      client.state = 'startjoin';
    });

    socket.on('startConfirm', function(data) {
      client.game = {id: data.id, players: data.players};
      client.game.revealedCards = {};
      client.state = 'waitinglist';
    });

    socket.on('joinConfirm', function(data) {
      client.game = {id: data.id, players: data.players};
      client.game.revealedCards = {};
      client.state = 'waitinglist';
    });

    socket.on('joinReject', function(data) {
      client.errors.join = data.error;
    });

    socket.on('startReject', function(data) {
      client.errors.start = data.error;
    });

    socket.on('disconnect', function() {
      client.disconnected = true;
    });
    
    // Home page Listeners


    // Game page listeners
    socket.on('gameCanStart', function() {
      client.game.canStart = true;
    });

    socket.on('gameStartConfirm', function(data) {
    // {question: userGame.question, playerTurn: playerWhoseTurn})
      client.game.isStarted = true;
      client.game.question = data.question;
      client.game.playerTurn = data.playerTurn;
    });

    socket.on('playerUpdate', function(data) {
      client.game.players = data.players;
    });

    socket.on('cardDrawn', function(data) {
      client.user.gameObj.hand.push(data);
    });

    socket.on('submitCardReject', function(data) {
      console.log('Error: ' + data.error);
    });

    socket.on('submitCardConfirm', function(data) {
      client.user.gameObj.hand = client.user.gameObj.hand.filter(function(item) {
        if (item.type === data.card.type && item.value === data.card.value) {
          return false;
        }
        else {
          return true;
        }
      });
      client.game.submitACard = false;
      client.state = 'waitingforchooser';
    });

    socket.on('yourTurnToChoose', function() {
      client.game.waitingForPlayerCards = true;
      client.game.submitACard = false;
      client.game.startNextRound = false;
      client.state = 'waitingforplayers';
    });

    socket.on('yourTurnToAnswer', function() {
      client.game.waitingForPlayerCards = false;
      client.game.submitACard = true;
      client.game.startNextRound = false;
      client.state = 'cards';
    });

    socket.on('waitingForCards', function(data) {
      client.game.waitingOnPlayers = data.numPlayers;
    });

    socket.on('waitingForChooser', function() {
      client.game.waitingForChooser = true;
      client.game.waitingOnPlayers = 0;
    });

    socket.on('chooseCard', function(data) {
      client.game.cardsToChoose = data.cards;
      client.game.waitingOnPlayers = 0;
    });

    socket.on('chooseConfirm', function() {
      client.game.cardsToChoose = undefined;
    });

    socket.on('cardChosen', function(data) {
      client.game.cardChosen = data;
      client.game.waitingForChooser = false;
      client.game.answer = data;
    });

    socket.on('showCards', function(data) {
      client.game.cardsToChoose = data.cards;
      client.game.waitingOnPlayers = 0;
    });

    socket.on('scoreUpdate', function(data) {
      client.game.scores = data;
      client.state = 'scoreupdate';
    });
    
    socket.on('startNextRoundPrompt', function() {
      client.game.startNextRound = true;
    });

    socket.on('roundStartConfirm', function(data) {
      client.game.isStarted = true;
      client.game.question = data.question;
      client.game.playerTurn = data.playerTurn;
      client.game.answer = undefined;
      client.game.startNextRound = false;
      client.game.cardsToChoose = undefined;
      client.game.revealedCards = {};
    });

    socket.on('cardRevealed', function(data) {
      client.game.revealedCards[data.value] = true;
    });

    socket.on('sessionLookup', function() {
      console.log('session lookup', $cookies.token);
      if ($cookies.token) {
        console.log('looking up session ', $cookies.token);
        socket.emit('sessionLookResponse', {token: $cookies.token});
      }
    });
    // Game page listeners

    // Home page functions
    this.signIn = function(username, token) {
      socket.emit('signIn', {username: username, token: token});
    };

    this.startGame = function() {
      socket.emit('requestStart', null);
    };

    this.joinGame = function(gameId) {
      socket.emit('requestJoin', {gameId: gameId.toLowerCase()});
    };
    // Home page functions


    // Game page functions
    this.requestGameStart = function() {
      socket.emit('requestGameStart', null);
    };

    this.submitCard = function(card) {
      if (typeof card === 'string') {
        card = JSON.parse(card);
      }
      socket.emit('submitCardRequest', {card: card});
    };
        
    this.chooseAnswer = function(card) {
      if (typeof card === 'string') {
        card = JSON.parse(card);
      }
      socket.emit('chooseAnswer', {card: card});
    };

    this.requestStartNextRound = function() {
      socket.emit('requestStartNextRound', null);
    };

    this.revealCard = function(card) {
      socket.emit('revealCard', card);
    }
    // Game page functions

  }]);
