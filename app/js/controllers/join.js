'use strict';

angular.module('pah.client.JoinCtrl', [])
  .controller('JoinCtrl', ['$scope', '$location', '$cookies', 'GameClient', function ($scope, $location, $cookies, GameClient) {
    $scope.showJoinForm = false;
    $scope.models = {};
    $scope.client = GameClient;

    console.log($cookies);

    $scope.toggleJoinForm = function() {
      $scope.showJoinForm = !$scope.showJoinForm;
    };

    $scope.joinGame = function() {
      if ($scope.models.gameId) {
        GameClient.joinGame($scope.models.gameId);
      }
    };

    $scope.startGame = function() {
      GameClient.startGame();
    };

    // watch for the state to get set to waitinglist and redirect
    $scope.$watch('client', function(newVal, oldVal) {
      if (newVal !== undefined && newVal.state === 'waitinglist') {
        // redirect to the waiting list when the game has been joined
        $location.path('/waitinglist');
      }
    }, true);

  }]);
