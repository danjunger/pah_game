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

  /**
 * CORS support.
 */

  app.all('*', function(req, res, next){
    if (!req.get('Origin')) return next();
    // use "*" here to accept any origin
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'PUT');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    // res.set('Access-Control-Allow-Max-Age', 3600);
    if ('OPTIONS' == req.method) return res.send(200);
    next();
  });


  app.use('/api/users', require('./api/user'));

  app.use('/auth', require('./auth'));

  // All other routes to use Angular routing in app/scripts/app.js
  app.route('/partials/*')
    .get(index.partials);
  app.route('/*')
    .get(index.index);


};
