'use strict';

angular.module('phonesAgainstHumanityApp')
  .controller('GameCtrl', function ($rootScope, $scope, $location, $timeout, socket) {
    if (!$rootScope.user) {
      $timeout(function() {
        $location.path('/');
      }, 2200);
    }

    var resetListeners = function() {
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

    // remove listeners to prevent events from firing more than once!
    $scope.$on('$destroy', function () {
      resetListeners();
    });

    $scope.requestGameStart = function() {
      socket.emit('requestGameStart', null);
    };

    socket.on('gameCanStart', function() {
      $rootScope.game.canStart = true;
    });

    socket.on('gameStartConfirm', function(data) {
    // {question: userGame.question, playerTurn: playerWhoseTurn})
      $rootScope.game.isStarted = true;
      $rootScope.game.question = data.question;
      $rootScope.game.playerTurn = data.playerTurn;
    });


    socket.on('playerUpdate', function(data) {
      $rootScope.game.players = data.players;
    });

    socket.on('cardDrawn', function(data) {
      $rootScope.user.gameObj.hand.push(data);
    });

    $scope.submitCard = function(card) {
      socket.emit('submitCardRequest', {card: JSON.parse(card)});
    };

    socket.on('submitCardReject', function(data) {
      console.log('Error: ' + data.error);
    });

    socket.on('submitCardConfirm', function(data) {
      $rootScope.user.gameObj.hand = $rootScope.user.gameObj.hand.filter(function(item) {
        if (item.type === data.card.type && item.value === data.card.value) {
          return false;
        }
        else {
          return true;
        }
      });
      $scope.submitACard = false;
    });

    socket.on('yourTurnToChoose', function() {
      $scope.waitingForPlayerCards = true;
      $scope.submitACard = false;
      $scope.startNextRound = false;
    });

    socket.on('yourTurnToAnswer', function() {
      $scope.waitingForPlayerCards = false;
      $scope.submitACard = true;
      $scope.startNextRound = false;
    });

    socket.on('waitingForCards', function(data) {
      $scope.waitingOnPlayers = data.numPlayers;
    });

    socket.on('waitingForChooser', function() {
      $scope.waitingForChooser = true;
      $scope.waitingOnPlayers = 0;
    });

    socket.on('chooseCard', function(data) {
      $scope.cardsToChoose = data.cards;
      $scope.waitingOnPlayers = 0;
    });
    
    $scope.chooseAnswer = function(card) {
      socket.emit('chooseAnswer', {card: JSON.parse(card)});
    };

    socket.on('chooseConfirm', function() {
      $scope.cardsToChoose = undefined;
    });

    socket.on('cardChosen', function(data) {
      $scope.cardChosen = data;
      $scope.waitingForChooser = false;
      $rootScope.game.answer = data;
    });

    socket.on('scoreUpdate', function(data) {
      $scope.scores = data;
    });
    
    socket.on('startNextRoundPrompt', function() {
      $scope.startNextRound = true;
    });

    $scope.requestStartNextRound = function() {
      socket.emit('requestStartNextRound', null);
    };

    socket.on('roundStartConfirm', function(data) {
      $rootScope.game.isStarted = true;
      $rootScope.game.question = data.question;
      $rootScope.game.playerTurn = data.playerTurn;
      $rootScope.game.answer = undefined;
    });
  });
