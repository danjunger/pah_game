exports.config = {
  allScriptsTimeout: 11000,

  specs: [
    'test/client/e2e/*.js'
  ],

  capabilities: {
    'browserName': 'chrome'
  },

  baseUrl: 'http://localhost:9000/',

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 10000
  },

  rootElement: 'html',

  chromeDriver: '/usr/local/lib/node_modules/protractor/selenium/chromedriver_2.10.zip',
  seleniumServerJar: '/usr/local/lib/node_modules/protractor/selenium/selenium-server-standalone-2.42.2.jar',
  seleniumAddress: 'http://127.0.0.1:4444/wd/hub'

};