'use strict';

angular.module('phonesAgainstHumanityApp', [
  'ngRoute',
  'socket-io'
])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/home',
        controller: 'HomeCtrl'
      })
      .when('/game', {
        templateUrl: 'partials/game',
        controller: 'GameCtrl',
        reloadOnSearch: false
      })
      .otherwise({
        redirectTo: '/'
      });
      
    $locationProvider.html5Mode(true);
  });