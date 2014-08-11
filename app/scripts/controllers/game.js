'use strict';

angular.module('phonesAgainstHumanityApp')
  .controller('GameCtrl', function ($rootScope, $scope, $location, $timeout, $route, GameClient) {
    if (!GameClient.user.authenticated) {
      $rootScope.pageTitle = 'Redirecting to login';
      $timeout(function() {
        $location.path('/');
      }, 2200);
    }

    $rootScope.$on('$routeChangeSuccess', function() {
      $rootScope.pageTitle = $route.current.title;
    });
    if (GameClient.user.authenticated) {
      $rootScope.pageTitle = $route.current.title;
    }

    $scope.gameService = GameClient;

    // remove listeners to prevent events from firing more than once!
    $scope.$on('$destroy', function () {
      GameClient.resetGameListeners();
      console.log('resetting game listeners');
    });

    $scope.requestGameStart = function() {
      GameClient.requestGameStart();
    };

    $scope.submitCard = function(card) {
      GameClient.submitCard(card);
    };
    
    $scope.chooseAnswer = function(card) {
      GameClient.chooseAnswer(card);
    };

    $scope.requestStartNextRound = function() {
      GameClient.requestStartNextRound();
    };
  });
