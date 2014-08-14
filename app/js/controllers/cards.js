'use strict';

angular.module('pah.client.CardCtrl', [])
  .controller('CardsCtrl', ['$scope', '$location', 'GameClient', function ($scope, $location, GameClient) {
    $scope.client = GameClient;


    if (!($scope.client.game && $scope.client.game.question)) {
      $location.path('/signin');
      return;
    }

    // set up the placeholders based on the question type
    switch($scope.client.game.question.type) {
      case '(Pick 1)':
        $scope.submission1 = [{'type': 'placeholder', 'value': 'Drag your answer here'}];
        break;
      case '(Pick 2)':
        $scope.submission1 = [{'type': 'placeholder', 'value': 'Drag your first answer here'}];
        $scope.submission2 = [{'type': 'placeholder', 'value': 'Drag your second answer here'}];
        break;
      case '(Pick 3)':
        $scope.submission1 = [{'type': 'placeholder', 'value': 'Drag your first answer here'}];
        $scope.submission2 = [{'type': 'placeholder', 'value': 'Drag your second answer here'}];
        $scope.submission3 = [{'type': 'placeholder', 'value': 'Drag your third answer here'}];
        break;
    }

    var dropCallBackMaker = function(indexNum) {
      return function(event, ui) {
        var targetArr;
        switch(indexNum) {
          case 0:
            targetArr = $scope.submission1;
            break;
          case 1:
            targetArr = $scope.submission2;
            break;
          case 2:
            targetArr = $scope.submission3;
            break;
        }

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
          $scope.client.user.gameObj.hand.push(orig);
        }

        $scope.resetPlaceHolders();
      };
    };

    $scope.dropSubmitCallbackCardOne = dropCallBackMaker(0);
    $scope.dropSubmitCallbackCardTwo = dropCallBackMaker(1);
    $scope.dropSubmitCallbackCardThree = dropCallBackMaker(2);

    $scope.resetPlaceHolders = function(event, ui) {
      // re-add the placeholder when the submit box is emptied
      if ($scope.submission1.length === 0 || $scope.submission1[0] === undefined) {
        var label = $scope.client.game.question.type === '(Pick 1)' ? 'Drag your answer here' : 'Drag your first answer here';
        $scope.submission1[0] = {'type': 'placeholder', 'value': label};
      }
      else if ($scope.submission2 && ($scope.submission2.length === 0 || $scope.submission2[0] === undefined)) {
        $scope.submission2[0] = {'type': 'placeholder', 'value': 'Drag your second answer here'};
      }
      else if ($scope.submission3 && ($scope.submission3.length === 0 || $scope.submission3[0] === undefined)) {
        $scope.submission3[0] = {'type': 'placeholder', 'value': 'Drag your third answer here'};
      }
    };

    $scope.submitCards = function() {
      var answer = $scope.submission1.concat($scope.submission2, $scope.submission3).filter(function(item) {
        return item !== undefined;
      });

      // TODO: add support for multiple cards
      GameClient.submitCard(answer[0]);
    };

    // watch for the state to get set to waitingforchooser and redirect
    $scope.$watch('client', function(newVal, oldVal) {
      if (newVal !== undefined && newVal.state === 'waitingforchooser') {
        $location.path('/waitingforchooser');
      }
    }, true);

  }]);
