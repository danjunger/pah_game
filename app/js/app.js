// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js

angular.module('PAHClient', [
  // libraries
  'ionic', 'socket-io', 'ngDragDrop',

  // project code
  'pah.client.GameClient', 'pah.client.CardCtrl', 'pah.client.JoinCtrl', 
  'pah.client.SignInCtrl', 'pah.client.WaitingListCtrl',
  'pah.client.WaitingForPlayersCtrl', 'pah.client.WaitingForChooserCtrl', 'pah.client.ScoreUpdateCtrl'
  ])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    .state('settings', {
      url: '/settings',
      templateUrl: "views/partials/settings.html",
      controller: 'SettingsCtrl'
    })

    .state('cardview', {
      url: '/cards',
      templateUrl: "views/partials/cards.html",
      controller: 'CardsCtrl'
    })

    .state('join', {
      url: '/join',
      templateUrl: "views/partials/start_join.html",
      controller: 'JoinCtrl'
    })

    .state('signin', {
      url: '/signin',
      templateUrl: "views/partials/signin.html",
      controller: 'SignInCtrl'
    })

    .state('waitinglist', {
      url: '/waitinglist',
      templateUrl: "views/partials/waiting_list.html",
      controller: 'WaitingListCtrl'
    })

    .state('waitingforplayers', {
      url: '/waitingforplayers',
      templateUrl: "views/partials/waiting_for_players.html",
      controller: 'WaitingForPlayersCtrl'
    })

    .state('waitingforchooser', {
      url: '/waitingforchooser',
      templateUrl: "views/partials/waiting_for_chooser.html",
      controller: 'WaitingForChooserCtrl'
    })

    .state('scoreupdate', {
      url: '/scoreupdate',
      templateUrl: "views/partials/score_update.html",
      controller: 'ScoreUpdateCtrl'
    })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/signin');

});
