'use strict';

angular.module('phonesAgainstHumanityApp', [
  'ngRoute',
  'socket-io'
])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/home',
        controller: 'HomeCtrl',
        title: 'Sign in to Play'
      })
      .when('/game', {
        templateUrl: 'partials/game',
        controller: 'GameCtrl',
        reloadOnSearch: false,
        title: 'Game in Progress'
      })
      .otherwise({
        redirectTo: '/'
      });
      
    $locationProvider.html5Mode(true);
  });