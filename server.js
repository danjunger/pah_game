'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    socketio = require('socket.io'),
    mongoose = require('mongoose');

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./server/config/config');

// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);

var GameServer = require('./server/game_server/game_server');

/**
 * Main application file
 */

// Bootstrap models
/*
var modelsPath = path.join(__dirname, 'server/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  if (/(.*)\.(js$|coffee$)/.test(file)) {
    require(modelsPath + '/' + file);
  }
});
*/

// Initialize DB: populate DB if empty, clear transient data
require('./server/config/dbinit');

// Setup Express
var app = express();
require('./server/config/express')(app);
require('./server/routes')(app);

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
