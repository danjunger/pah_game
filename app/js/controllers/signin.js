'use strict';

angular.module('pah.client.SignInCtrl', [])
  .controller('SignInCtrl', ['$scope', '$http', '$location', 'GameClient', function ($scope, $http, $location, GameClient) {
    $scope.showSignUp = true;
    $scope.user = {};

    $scope.toggleSignUp = function() {
      $scope.showSignUp = !$scope.showSignUp;
    };

    $scope.signIn = function() {
      $scope.error = undefined;
      var authPromise = $http.post('auth/local', {email: $scope.user.username, password: $scope.user.password});        
      var authSuccess = function(data) {
        GameClient.authenticated = data.token;
        GameClient.signIn($scope.user.username);
        $location.path('/join');
      };
      var authFail = function(data) {
        $scope.error = data.data.message;
      };

      authPromise.then(authSuccess, authFail);
    };

    $scope.signUp = function() {
      $scope.registerError = undefined;
      var registerPromise = $http.post('api/users/', {email: $scope.user.username, password: $scope.user.password});        
      var registerSuccess = function(data) {
        $scope.signIn();
      };
      var registerFail = function(data) {
        $scope.registerError = data.data.message;
      };

      registerPromise.then(registerSuccess, registerFail);
    };

  }]);
