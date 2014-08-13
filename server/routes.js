'use strict';

var index = require('./controllers');

/**
 * Application routes
 */
module.exports = function(app) {

  // Server API Routes
  /*
  app.route('/api/awesomeThings')
    .get(api.awesomeThings);
  
  app.route('/api/message').get(api.message);

  // All undefined api routes should return a 404
  app.route('/api/*')
    .get(function(req, res) {
      res.send(404);
    });
*/


  app.use('/api/users', require('./api/user'));

  app.use('/auth', require('./auth'));

  // All other routes to use Angular routing in app/scripts/app.js
  app.route('/partials/*')
    .get(index.partials);
  app.route('/*')
    .get(index.index);


};
