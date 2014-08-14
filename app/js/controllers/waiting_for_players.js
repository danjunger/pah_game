'use strict';

angular.module('pah.client.WaitingForPlayersCtrl', [])
  .controller('WaitingForPlayersCtrl', ['$scope', '$location', 'GameClient', function ($scope, $location, GameClient) {
    $scope.client = GameClient; 

    $scope.submission = [{'type': 'placeholder', 'value': 'Drag your choice here'}];


    // get an object of the same size with all false values initially
    $scope.answersShown = {};
    $scope.submission.forEach(function(item) {
      $scope.answersShown[item] = false;
    });

    $scope.reveal = function(answer) {
      $scope.answersShown[answer.value] = true;

      // generate an event to alert the players a card was revealed so they see it happen too...
      $scope.client.revealCard(answer);
    };

    $scope.dropSubmitCallBack = function(event, ui) {
      var targetArr = $scope.submission;

      // splice the added element off the end of the list
      var newSub = targetArr.splice(targetArr.length - 1, 1)[0];

      // remove the placeholder!
      if (targetArr[0].type === 'placeholder') {
        // replace the placeholder with the new element
        targetArr.splice(0, 1, newSub);
      }
      // swap this item if there was another one
      else {
        // replace the orig item with the new one
        var orig = targetArr.splice(0, 1, newSub)[0];
        $scope.client.game.cardsToChoose.push(orig);
      }

      $scope.resetPlaceHolders();
    };

    $scope.resetPlaceHolders = function(event, ui) {
      // re-add the placeholder when the submit box is emptied
      if ($scope.submission.length === 0 || $scope.submission[0] === undefined) {
        var label = 'Drag your choice here';
        $scope.submission[0] = {'type': 'placeholder', 'value': label};
      }
    };

    $scope.submit = function() {
      if ($scope.submission.length > 0 && $scope.submission[0].type !== 'placeholder') {
        GameClient.chooseAnswer($scope.submission[0]);  
      }
    };

    // watch for the state to get set to scoreupdate and redirect
    $scope.$watch('client', function(newVal, oldVal) {
      // this event goes to the chooser, direct them to the choosing page
      if (newVal !== undefined && newVal.state === 'scoreupdate') {
        $location.path('/scoreupdate');
      }
    }, true);
    
  }]);
