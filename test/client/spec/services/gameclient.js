'use strict';

describe('Service: Gameclient', function () {

  // load the service's module
  beforeEach(module('phonesAgainstHumanityApp'));

  // instantiate service
  var client;
  beforeEach(inject(function (_GameClient_) {
    client = _GameClient_;
  }));

  it('should be able to sign in', function(done) {
    client.signIn('asdf');

    console.log(client.user);
    console.log(client.user.id);

    $timeout(function() {
      console.log(client.user);
      done();
    }, 5000);
  });

  it('takes a long time', function(done) {
    setTimeout(function() {
      done();
    }, 9000);
  });

  it('should do something', function () {
    expect(!!client).toBe(true);
  });

});
