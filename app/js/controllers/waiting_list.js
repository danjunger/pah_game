'use strict';

angular.module('pah.client.WaitingListCtrl', [])
  .controller('WaitingListCtrl', ['$scope', '$location', 'GameClient', function ($scope, $location, GameClient) {
    $scope.client = GameClient;

    $scope.startGame = function() {
      $scope.client.requestGameStart();
    };

    // watch for the state to get set to waitingforplayers or cards and redirect
    $scope.$watch('client', function(newVal, oldVal) {
      // this event goes to the chooser, direct them to the choosing page
      if (newVal !== undefined && newVal.state === 'waitingforplayers') {
        $location.path('/waitingforplayers');
      }
      // this event goes to the players who will be submitting a card, direct them to the cards page
      else if (newVal !== undefined && newVal.state === 'cards') {
        $location.path('/cards');
      }
    }, true);

  }]);
