'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    socketio = require('socket.io');

var GameServer = require('./lib/game_server/game_server');

/**
 * Main application file
 */

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./lib/config/config');

// Bootstrap models
var modelsPath = path.join(__dirname, 'lib/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  if (/(.*)\.(js$|coffee$)/.test(file)) {
    require(modelsPath + '/' + file);
  }
});

// Populate empty DB with sample data
//require('./lib/config/dummydata');

// Setup Express
var app = express();
require('./lib/config/express')(app);
require('./lib/routes')(app);

// Start server
var appServer = http.createServer(app);
var io = socketio.listen(appServer);
appServer.listen(config.port, config.ip, function () {
  console.log('Express server listening on %s:%d, in %s mode', config.ip, config.port, app.get('env'));
});

// Start the socket.io game server
var gs = new GameServer(io);

// Expose app
exports = module.exports = app;
