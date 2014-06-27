'use strict';

angular.module('phonesAgainstHumanityApp')
  .controller('HomeCtrl', function ($rootScope, $scope, $location, GameClient) {
    // remove listeners to prevent events from firing more than once!
    $scope.$on('$destroy', function () {
      console.log('calling destroy');
      GameClient.resetHomeListeners();
    });

    $scope.gameService = GameClient;

    $scope.$watch('gameService.game', function(newVal) {
      if (newVal.id) {
        $location.path('/game');
      }
    });

    // Send signIn event to create the player on the server
    $scope.signIn = function(username) {
      GameClient.signIn(username);
    };

    $scope.startGame = function() {
      GameClient.startGame();
    };

    $scope.joinGame = function(join) {
      GameClient.joinGame(join.gameId);
    };
  });
