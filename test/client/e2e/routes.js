'use strict';

//var ptor = protractor.getInstance();
describe('E2E: Routes', function() {
  it('should load the index page', function() {
    browser.get('/#/');

    expect(browser.getCurrentUrl()).toMatch(/.*\/$/);
    expect(browser.getTitle()).toBe('Sign in to Play | PAH Game');
  });
});
