'use strict';

describe('Service: Gameclient', function () {

  // load the service's module
  beforeEach(module('phonesAgainstHumanityApp'));

  // instantiate service
  var Gameclient;
  beforeEach(inject(function (_Gameclient_) {
    Gameclient = _Gameclient_;
  }));

  it('should do something', function () {
    expect(!!Gameclient).toBe(true);
  });

});
