'use strict';

angular.module('pah.client.WaitingForChooserCtrl', [])
  .controller('WaitingForChooserCtrl', function ($scope, GameClient, $location, $timeout) {
    $scope.client = GameClient;

    // get an object of the same size with all false values initially
    $scope.answersShown = {};

    // reveal will be called when the chooser reveals the card himself/herself :)
    $scope.reveal = function(key) {
      $scope.answersShown[key] = true;
    };

    // watch for the cards to be submitted
    $scope.$watch('client.game', function(newVal, oldVal) {
      // this event goes to the chooser, direct them to the choosing page
      if (newVal !== undefined && newVal.id !== undefined && newVal.cardsToChoose !== undefined) {
        newVal.cardsToChoose.forEach(function(item) {
          $scope.answersShown[item] = false;
        });
      }
    }, true);

    // watch for the state to get set to scoreupdate and redirect
    $scope.$watch('client', function(newVal, oldVal) {
      // this event goes to the chooser, direct them to the choosing page
      if (newVal !== undefined && newVal.state === 'scoreupdate') {
        $location.path('/scoreupdate');
      }
    }, true);

    // simulate the revealing
    $timeout(function() {
      if ($scope.client.game.cardsToChoose) {
        for (var i = 0; i < $scope.client.game.cardsToChoose.length; i++) {
          $scope.reveal($scope.client.game.cardsToChoose[i].value);  
        }
      }
    }, 2000);


  });
