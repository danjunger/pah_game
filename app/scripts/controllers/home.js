'use strict';

angular.module('phonesAgainstHumanityApp')
  .controller('HomeCtrl', function ($rootScope, $scope, $location, socket) {
    
    var resetListeners = function() {
      socket.removeAllListeners('signInConfirm');
      socket.removeAllListeners('startConfirm');
      socket.removeAllListeners('joinConfirm');
    };

    // remove listeners to prevent events from firing more than once!
    $scope.$on('$destroy', function () {
      resetListeners();
    });

    // Listening to an event
    socket.on('signInConfirm', function(data) {
      $rootScope.user = data;
    });

    socket.on('startConfirm', function(data) {
      $location.path('/game');
      $rootScope.game = {id: data.id, players: data.players};
      $rootScope.user.gameId = data.id;
    });

    socket.on('joinConfirm', function(data) {
      $location.path('/game');
      $rootScope.game = {id: data.id, players: data.players};
      $rootScope.user.gameId = data.id;
    });

    // Send signIn event to create the player on the server
    $scope.signin = function(username) {
      socket.emit('signIn', username);
    };

    $scope.startGame = function() {
      socket.emit('requestStart', null);
    };

    $scope.joinGame = function(username, gameId) {
      socket.emit('requestJoin', {gameId: gameId.toLowerCase()});
    };
  });
