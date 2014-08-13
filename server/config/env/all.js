'use strict';

var path = require('path');

var rootPath = path.normalize(__dirname + '/../../..');

module.exports = {
  root: rootPath,
  port: process.env.PORT || 9000,
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'yo-ang-template-secret'
  },
};