'use strict';

angular.module('pah.client.SignInCtrl', [])
  .controller('SignInCtrl', ['$scope', '$http', '$location', '$cookies', 'GameClient', function ($scope, $http, $location, $cookies, GameClient) {
    $scope.showSignUp = true;
    $scope.user = {};
    $scope.client = GameClient;

    $scope.toggleSignUp = function() {
      $scope.showSignUp = !$scope.showSignUp;
    };

    $scope.signIn = function() {
      $scope.error = undefined;
      var authPromise = $http.post('auth/local', {username: $scope.user.username, password: $scope.user.password});        
      var authSuccess = function(data) {
        $scope.client.authenticated = data.data.token;
        $scope.client.signIn($scope.user.username, $scope.client.authenticated);
        $location.path('/join');
        $cookies.token = data.data.token;

      };
      var authFail = function(data) {
        $scope.error = data.data.message;
      };

      authPromise.then(authSuccess, authFail);
    };

    $scope.signUp = function() {
      $scope.registerError = undefined;
      var registerPromise = $http.post('api/users/', {username: $scope.user.username, email: $scope.user.email, password: $scope.user.password});        
      var registerSuccess = function(data) {
        $scope.signIn();
      };
      var registerFail = function(data) {
        $scope.registerError = data.data.message;
      };

      registerPromise.then(registerSuccess, registerFail);
    };

  }]);
