var should = require('should');
var io = require('socket.io-client');
var assert = require('assert');
var async = require('async');

var socketURL = 'ws://localhost:9000';

var options = {
  transports: ['websocket'],
  'forceNew': true
};

var user1 = {'name':'u1'};
var user2 = {'name':'u2'};
var user3 = {'name':'u3'};
var user4 = {'name':'u4'};

var connectToServer = function(callback) {
  var client = io.connect(socketURL, options);

  client.on('connect', function(data){
    if (typeof callback == 'function') {
      callback(client);
    }
  });
};

var signIn = function(clientName, callback) {
  var signInCallback = function(client) {
    client.emit('signIn', clientName);

    client.on('signInConfirm', function(data) {
      var myUser = data;

      // call the provided function
      if (typeof callback == 'function') {
        callback(client, myUser);
      }
    });
  };

  connectToServer(signInCallback);
};

var joinGame = function(user, gameId, joinCallback, updateCallback) {
  var joinGameCallback = function(client, userInfo) {
    client.emit('requestJoin', {user: userInfo, gameId: gameId});

    client.on('playerUpdate', function(updateData) {
      if (typeof updateCallback == 'function') {
        updateCallback(client, userInfo, updateData);
      }
    });

    client.on('joinConfirm', function(data) {
      if (typeof joinCallback == 'function') {
        joinCallback(client, userInfo, data);
      }
    });
  };

  signIn(user, joinGameCallback);
};

var createGame = function(clientName, createCallback, updateCallback, gameCanStartCallback) {
  var createGameCallback = function(client, userInfo) {
    client.emit('requestStart', userInfo);

    client.on('playerUpdate', function(updateData) {
      if (typeof updateCallback == 'function') {
        updateCallback(client, userInfo, updateData);
      }
    });

    client.on('startConfirm', function(gameInfo) {
      if (typeof createCallback == 'function') {
        createCallback(client, userInfo, gameInfo);
      }
    });

    client.on('gameCanStart', function(gameInfo) {
      if (typeof gameCanStartCallback == 'function') {
        gameCanStartCallback(client, userInfo, gameInfo);
      }
    });
  };

  signIn(clientName, createGameCallback);
};


// ASYNC HELPER METHODS
var signInMaker = function(user) {
  return function(callback) {
    var client = io.connect(socketURL, options);
    client.emit('signIn', user);

    client.on('signInConfirm', function(data) {
      callback(null, client, data);
    });
  };
};

var joinGameMaker = function(user, clientListeners) {
  return function(client, userInfo, callbackData, callback) {
    async.waterfall([
      signInMaker(user),
      function(chainClient, chainUserInfo, chainCallback) {
        for (var key in clientListeners) {
          if (typeof clientListeners[key] == 'function') {
            // wrap the call within a closure to protect the iterator variable!
            (function(myKey) {
              chainClient.on(myKey, function(data) {
                clientListeners[myKey](chainClient, chainUserInfo, data, callbackData, myKey);
              });  
            })(key);
          }
        }

        chainClient.emit('requestJoin', {gameId: callbackData['startConfirm'].id});
        chainCallback(null, chainClient, chainUserInfo, callbackData);
      }
      ], 
    function(err, client, userInfo, callbackData) {
      callback(null, client, userInfo, callbackData);
    });
  };
};

var requestStartMaker = function(clientListeners) {
  return function(client, userInfo, callback) {
    var callbackData = {};

    for (var key in clientListeners) {
      if (typeof clientListeners[key] == 'function') {
        // wrap the call within a closure to protect the iterator variable!
        (function(myKey) {
          client.on(myKey, function(data) {
            clientListeners[myKey](client, userInfo, data, callbackData, myKey);
          });  
        })(key);  
      }
    }

    client.emit('requestStart', userInfo);
    callback(null, client, userInfo, callbackData);
  };
};

var createGameMaker = function(user, clientListeners) {
  return function(callback) {
    async.waterfall([
      signInMaker(user),
      requestStartMaker(clientListeners)
      ], 
    function(err, client, userInfo, callbackData) {
      callback(null, client, userInfo, callbackData);
    });
  };
};

var storeData = function(client, userInfo, data, callbackData, key) {
  callbackData[key] = data;
};

var startConfirmDefault = function(client, userInfo, data, callbackData, key) {
  callbackData[key] = data;
  callbackData['connections'] = [];
  callbackData['connections'].push({client: client, userInfo: userInfo});
};

var joinConfirmDefault = function(client, userInfo, data, callbackData, key) {
  callbackData['connections'].push({client: client, userInfo: userInfo});
};

var gameCanStartDefault = function(client, userInfo, data, callbackData, key) {
  callbackData['connections'][0].client.emit('requestGameStart', {});
};

var yourTurnToChooseDefault = function(client, userInfo, data, callbackData, key) {
  callbackData[key] = client;
};

var yourTurnToAnswerDefault = function(client, userInfo, data, callbackData, key) {
  callbackData[key] = callbackData[key] || [];
  callbackData[key].push(client);
};

var cardDrawnDefault = function(client, userInfo, data, callbackData, key) {
  var index = findConnection(callbackData, client);
  callbackData['connections'][index].cards = callbackData['connections'][index].cards || [];
  callbackData['connections'][index].cards.push(data);
};

var disconnectAll = function(callbackData) {
  callbackData['connections'].forEach(function(cl) {
    cl.client.disconnect();
  });
};

var findConnection = function(callbackData, client) {
  for (var i = 0; i < callbackData['connections'].length; i++) {
    if (callbackData['connections'][i].client === client) {
      return i;
    }
  }
  return -1;
};

describe("Game Server",function(){

  it('should sign in on connection (async)', function(done) {
    async.waterfall([
      signInMaker(user1)
      ], 
    function(err, client, userInfo) {
      // client id should be the socket id
      assert.equal(client.io.engine.id, userInfo.socketId);

      // userInfo.authenticated should be true on successful signin
      assert.equal(userInfo.authenticated, true);

      // userInfo.id should be a 10 character unique id
      assert.equal(userInfo.id.length, 10);

      // userInfo.gameObj should be a game object
      assert.equal(typeof userInfo.gameObj, 'object');

      // gameId should initially be 0
      assert.equal(userInfo.gameId, 0);

      client.disconnect();
      done();
    });
  });

  it('should fail to create a game when not authenticated (async)', function(done) {
    async.waterfall([
      function(callback) {
        var client = io.connect(socketURL, options);
        client.emit('requestStart', user1);

        client.on('startReject', function(data) {
          callback(null, client, data);
        });
      }
      ], 
    function(err, client, data) {
      // data should contain an error message
      assert.equal(data.error, 'User not authenticated.');

      client.disconnect();
      done();
    });
  });

  it('should fail to join a game when not authenticated (async)', function(done) {
    async.waterfall([
      function(callback) {
        var client = io.connect(socketURL, options);
        client.emit('requestJoin', {user: user1, gameId: 'asdf'});

        client.on('joinReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      assert.equal(err.error, 'User not authenticated.');

      client.disconnect();
      done();
    });
  });

  it('should fail to join a game whose id does not exist (async)', function(done) {
    async.waterfall([
      signInMaker(user1),
      function(client, userInfo, callback) {
        client.emit('requestJoin', {user: user1, gameId: 'asdf'});

        client.on('joinReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      try {
        assert.equal(err.error, 'Game not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should be able to create a game (async)', function(done) {
    // verify the data from both callbacks
    var onFinish = function(client, callbackData) {
      if (callbackData['startConfirm'] && callbackData['playerUpdate']) {
        client.disconnect();
        done();
      }
    };
    var onError = function(client, error) {
      client.disconnect();
      done(error);
    };

    var listeners = {
      'startConfirm': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.id.length, 5);
          assert.equal(data.players.length, 1);
          assert.equal(data.players[0].name, user1.name);
        } catch(e) {
          onError(client, e);
          return;
        }

        // set callback data for this handler
        callbackData[key] = data;
        onFinish(client, callbackData);
      },
      'playerUpdate': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.players.length, 1);
          assert.equal(data.players[0].name, user1.name);
        } catch(e) {
          onError(client, e);
          return;
        }

        // set callback data for this handler
        callbackData[key] = data;
        onFinish(client, callbackData);
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners)
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should be able to join a game (async)', function(done) {
    var playerUpdates = 0;
    var onFinish = function(client, callbackData) {
      // disconnect all clients
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
      client.disconnect();
      done();
    };
    var onError = function(client, callbackData, error) {
      // disconnect all clients
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
      client.disconnect();

      done(error);
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.players.length, 2);
          assert.equal(data.players[0].name, user1.name);
          assert.equal(data.players[1].name, user2.name);
        } catch(e) {
          onError(client, callbackData, e);
          return;
        }

        callbackData['joinConfirm'] = data;
      },
      'playerUpdate': function(client, userInfo, data, callbackData, key) {
        playerUpdates++;

        try {
          if (playerUpdates == 1) {
            assert.equal(data.players.length, 1);
            assert.equal(data.players[0].name, user1.name);
          }

          if (playerUpdates == 2 && callbackData['joinConfirm']) {
            assert.equal(data.players.length, 2);
            assert.equal(data.players[0].name, user1.name);
            assert.equal(data.players[1].name, user2.name);

            onFinish(client, callbackData);
          }  
        } catch(e) {
          onError(client, callbackData, e);
          return;
        }
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners)
      ], 
    function(err, client, userInfo, callbackData) {   
    });
  });

  it('should alert player 1 when the game may be started (async)', function(done) {
    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.id.length, 5);
          assert.equal(data.players.length > 2, true);
        } catch(e) {
          disconnectAll(callbackData);
          done(e);
          return;
        }

        disconnectAll(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners)
      ], 
    function(err, client, userInfo, callbackData) {   
    });
  });

/*
  it('should let 50 users connect to the same game', function(done) {
    var clientsConnected = [];
    var targetNumClients = 50;

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      for (var i = 0; i < targetNumClients - 1; i++) {
        joinGame({'name': 'u' + i}, gameInfo.id, joinCallback, null);
      }
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});
    }

    var updateCallback = function(client, userInfo, data) {
      if (data.players.length == targetNumClients - 1) {
        // disconnect everyone and end the test
        clientsConnected.forEach(function(c) {
          c.client.disconnect();
        });
        
        done();
      }
    };

    createGame(user1, createCallback, updateCallback, null);
  });
*/

  it('should not allow game to start when provided an invalid gameid (async)', function(done) {
    async.waterfall([
      signInMaker(user1),
      function(client, data, callback) {
        client.emit('requestGameStart', {});

        client.on('gameStartReject', function(data) {
          callback(null, data, client);
        });
      }
      ], 
    function(err, data, client) {
      try {
        assert.equal(data.error, 'Game not found.');
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      client.disconnect();
      done();
    });
  });

  it('should not allow game to start when requested by an un-authenticated user (async)', function(done) {
    var client = io.connect(socketURL, options);
    client.emit('requestGameStart', {user: user1, gameId: '123'});

    client.on('gameStartReject', function(data) {
      try {
        assert.equal(data.error, 'User not found.');
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should not allow game to start when there are less than 3 players connected (async)', function(done) {
    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameStartReject': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.error, 'Game must have at least three players to start.');
        } catch(e) {
          disconnectAll(callbackData);
          done(e);
          return;
        }

        disconnectAll(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners)
      ], 
    function(err, client, userInfo, callbackData) {
      callbackData['connections'][0].client.emit('requestGameStart', {});
    });
  });

  it('should not allow game to be started by anyone other than the creator of the game (async)', function(done) {
    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameStartReject': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.error, 'Only the game owner may start the game.');
        } catch(e) {
          disconnectAll(callbackData);
          done(e);
          return;
        }

        disconnectAll(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners)
      ], 
    function(err, client, userInfo, callbackData) {
      callbackData['connections'][1].client.emit('requestGameStart', {});
    });
  });

  it('should allow a game to be started! (async)', function(done) {
    var numWaitingForCards = 0;
    var numStartConfirm = 0;

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'gameStartConfirm': function(client, userInfo, data, callbackData, key) {
        // { question: { type: '(Pick 1)', value: 'What\'s there a ton of in heaven?' }, playerTurn: { name: 'u3', id: 'E8CFBMbKoD' } }
        callbackData[key] = data;
        numStartConfirm++;

        try {
          assert.equal(typeof data.question.type, 'string');
          assert.equal(typeof data.question.value, 'string');

          assert.equal(typeof data.playerTurn.name, 'string');
          assert.equal(typeof data.playerTurn.id, 'string');
          assert.equal(data.playerTurn.id.length, 10);  
        } catch(e) {
          done(e);
        }
      },
      'yourTurnToChoose': function(client, userInfo, data, callbackData, key) {
        callbackData[key] = userInfo;
        try {
          assert.equal(userInfo.name, callbackData['gameStartConfirm'].playerTurn.name);
          assert.equal(userInfo.id, callbackData['gameStartConfirm'].playerTurn.id);
        } catch(e) {
          done(e);
        }
      },
      'yourTurnToAnswer': function(client, userInfo, data, callbackData, key) {
        callbackData[key] = callbackData[key] || [];
        callbackData[key].push(userInfo);

        try {
          assert.notEqual(userInfo.name, callbackData['gameStartConfirm'].playerTurn.name);
          assert.notEqual(userInfo.id, callbackData['gameStartConfirm'].playerTurn.id);
        } catch(e) {
          done(e);
        }
      },
      'cardDrawn': function(client, userInfo, data, callbackData, key) {
        // { type: 'Answer', value: 'A disappointing birthday party.' }
        try {
          assert.equal(data.type, 'Answer');
          assert.equal(typeof data.value, 'string');  
        } catch(e) {
          done(e);
        }

        var index = findConnection(callbackData, client);
        callbackData['connections'][index].cards = callbackData['connections'][index].cards || [];
        callbackData['connections'][index].cards.push(data);
      },
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // since this is the last callback, when count is 3 it will be the final callback of the test case
        if (numWaitingForCards === 3) {
          try {
            assert.equal(data.numPlayers, 2);
            assert.equal(numStartConfirm, 3);

            // verify we have 3 unique clients
            assert.equal(callbackData['connections'].length, 3);
            callbackData['connections'].forEach(function(cl) {
              assert.equal(cl.cards.length, 7);
            });
          } catch(e) {
            disconnectAll(callbackData)
            done(e);
            return;
          }
          
          disconnectAll(callbackData);
          done();
        }
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {      
    });
  });
  
  it('should prevent card submission when not logged in (async)', function(done) {
    async.waterfall([
      function(callback) {
        var client = io.connect(socketURL, options);
        client.emit('submitCardRequest', {card: { type: 'Answer', value: 'A disappointing birthday party.' }});

        client.on('submitCardReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'User not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should prevent card submission when provided an invalid (or null) gameid (async)', function(done) {
    async.waterfall([
      signInMaker(user1),
      function(client, userInfo, callback) {
        client.emit('submitCardRequest', {card: { type: 'Answer', value: 'A disappointing birthday party.' }});

        client.on('submitCardReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'Game not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should prevent card submission when the game is not ready (async)', function(done) {
    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': function(client, userInfo, data, callbackData, key) {
        client.emit('submitCardRequest', {card: { type: 'Answer', value: 'A disappointing birthday party.' }});
      },
      'submitCardReject': function(client, userInfo, data, callbackData, key) {
        try {
          assert.equal(data.error, 'Game not ready for card submission.');  
        } catch(e) {
          client.disconnect();
          callbackData['connections'][0].client.disconnect();
          done(e);
          return;
        }
        
        client.disconnect();
        callbackData['connections'][0].client.disconnect();
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners)
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should allow players to submit cards (async)', function(done) {
    var numWaitingForCards = 0;
    var numShown = 0;

    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var showOrChooseCard = function(client, userInfo, data, callbackData, key) {
      // { cards: [ { type: 'Answer', value: 'My manservant, Claude.' }, { type: 'Answer', value: 'That thing that electrocutes your abs.' } ] }
      try {
        assert.equal(data.cards.length, 2);
        assert.equal(typeof data.cards[0], 'object');
        assert.equal(typeof data.cards[1], 'object');
      } catch(e) {
        onFinish(callbackData);
        done(e);
        return;
      }

      numShown++;
      if (numShown == 3) {
        onFinish(callbackData);
        done();
      }
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            var client2 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][1])];

            client1.client.emit('submitCardRequest', {card: client1.cards[0]});
            client2.client.emit('submitCardRequest', {card: client2.cards[0]});
          }
        }
      },
      'submitCardConfirm': function(client, userInfo, data, callbackData, key) {
        // { accepted: true, card: { type: 'Answer', value: 'Tiny nipples.' } }
        try {
          assert.equal(data.accepted, true);
          assert.equal(data.card.type, 'Answer');
          assert.equal(typeof data.card.value, 'string');  
        } catch(e) {
          onFinish(callbackData);
          done(e);
        }
      },
      'waitingForChooser': function(client, userInfo, data, callbackData, key) {
        // null
        try {
          assert.equal(data, null);
        } catch(e) {
          onFinish(callbackData);
          done(e);
        }
      },
      'chooseCard': showOrChooseCard,
      'showCards': showOrChooseCard
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should prevent players from submitting invalid cards (async)', function(done) {
    var numWaitingForCards = 0;

    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            client1.client.emit('submitCardRequest', {card: {type: 'Answer', value: 'I made this one up'} });
          }
        }
      },
      'submitCardReject': function(client, userInfo, data, callbackData, key) {
        // {"error":"Invalid card submitted."}
        try {
          assert.equal(data.error, 'Invalid card submitted.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }

        onFinish(callbackData);
        done();
      },
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should prevent a player from submitting multiple cards (async)', function(done) {
    var numWaitingForCards = 0;

    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            client1.client.emit('submitCardRequest', {card: client1.cards[0] });
            client1.client.emit('submitCardRequest', {card: client1.cards[4] });
          }
        }
      },
      'submitCardReject': function(client, userInfo, data, callbackData, key) {
        // {"error":"User has already submitted a card."}
        try {
          assert.equal(data.error, 'User has already submitted a card.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }

        onFinish(callbackData);
        done();
      },
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should prevent card choosing when not logged in (async)', function(done) {
    async.waterfall([
      function(callback) {
        var client = io.connect(socketURL, options);
        client.emit('chooseAnswer', {card: { type: 'Answer', value: 'A disappointing birthday party.' }});

        client.on('chooseAnswerReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'User not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should prevent card choosing when provided an invalid gameid (async)', function(done) {
    async.waterfall([
      signInMaker(user1),
      function(client, userInfo, callback) {
        client.emit('chooseAnswer', {card: { type: 'Answer', value: 'A disappointing birthday party.' }});

        client.on('chooseAnswerReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'Game not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should prevent other players from choosing out of turn (async)', function(done) {
    var numWaitingForCards = 0;
    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            var client2 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][1])];
            client1.client.emit('submitCardRequest', {card: client1.cards[0] });
            client2.client.emit('submitCardRequest', {card: client2.cards[0] });
          }
        }
      },
      'chooseAnswerReject': function(client, userInfo, data, callbackData, key) {
        // {"error":"It is not the user's turn to choose."}
        try {
          assert.equal(data.error, 'It is not the user\'s turn to choose.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }
        onFinish(callbackData);
        done();
      },
      'chooseCard': function(client, userInfo, data, callbackData, key) {
        var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
        client1.client.emit('chooseAnswer', {card: data.cards[0]});
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });
  
  it('should prevent choosing a card that does not exist (async)', function(done) {
    var numWaitingForCards = 0;
    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            var client2 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][1])];
            client1.client.emit('submitCardRequest', {card: client1.cards[0] });
            client2.client.emit('submitCardRequest', {card: client2.cards[0] });
          }
        }
      },
      'chooseAnswerReject': function(client, userInfo, data, callbackData, key) {
        // {"error":"Invalid card choice."}
        try {
          assert.equal(data.error, 'Invalid card choice.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }
        onFinish(callbackData);
        done();
      },
      'chooseCard': function(client, userInfo, data, callbackData, key) {
        var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
        client.emit('chooseAnswer', {card: client1.cards[5]});
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should prevent choosing when the game is not ready (async)', function(done) {
    var numWaitingForCards = 0;
    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            client1.client.emit('submitCardRequest', {card: client1.cards[0]});
            
            callbackData['yourTurnToChoose'].emit('chooseAnswer', {card: client1.cards[0]});
          }
        }
      },
      'chooseAnswerReject': function(client, userInfo, data, callbackData, key) {
        // {"error":"Game not yet ready for choice."}
        try {
          assert.equal(data.error, 'Game not yet ready for choice.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }
        onFinish(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should reward a point for a valid choice (async)', function(done) {
    var numWaitingForCards = 0;
    var numShown = 0;

    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': yourTurnToChooseDefault,
      'yourTurnToAnswer': yourTurnToAnswerDefault,
      'cardDrawn': cardDrawnDefault,
      'waitingForCards': function(client, userInfo, data, callbackData, key) {
        // data: { numPlayers: 2 }
        numWaitingForCards++;

        // wait until all 3 get the initial callback
        if (numWaitingForCards >= 3) {
          // submit the cards
          if (data.numPlayers === 2) {
            
            var client1 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][0])];
            var client2 = callbackData['connections'][findConnection(callbackData, callbackData['yourTurnToAnswer'][1])];

            client1.client.emit('submitCardRequest', {card: client1.cards[0]});
            client2.client.emit('submitCardRequest', {card: client2.cards[0]});
          }
        }
      },
      'chooseCard': function(client, userInfo, data, callbackData, key) {
        // data: { cards: [ { type: 'Answer', value: 'My manservant, Claude.' }, { type: 'Answer', value: 'That thing that electrocutes your abs.' } ] }
        client.emit('chooseAnswer', {card: data.cards[0]});
      },
      'chooseConfirm': function(client, userInfo, data, callbackData, key) {
        // data: null
        try {
          assert.equal(data, null);
        } catch(e) {
          done(e);
        }
      }, 
      'cardChosen': function(client, userInfo, data, callbackData, key) {
        // data: { card: { type: 'Answer', value: 'The mixing of the races.' }, winner: { name: 'u1', id: 's3wPGUqFmT' } }
        try {
          assert.equal(typeof data.card, 'object');
          assert.equal(data.card.type, 'Answer');
          assert.equal(typeof data.card.value, 'string');

          assert.equal(typeof data.winner, 'object');
          assert.equal(typeof data.winner.name, 'string');
          assert.equal(typeof data.winner.id, 'string');  
        } catch(e) {
          done(e);
        }
      },
      'scoreUpdate': function(client, userInfo, data, callbackData, key) {
        // data: [ { name: 'u1', id: 's3wPGUqFmT', score: 1 }, { name: 'u2', id: 'APGC6m2MCh', score: 0 }, { name: 'u3', id: 'EamrWoHFmP', score: 0 } ]
        try {
          assert.equal(Array.isArray(data), true);
          assert.equal(typeof data[0], 'object');
          assert.equal(typeof data[0].name, 'string');
          assert.equal(typeof data[0].id, 'string');
          assert.equal(typeof data[0].score, 'number');
        } catch(e) {
          done(e);
        }
      },
      'startNextRoundPrompt': function(client, userInfo, data, callbackData, key) {
        // data: null
        try {
          assert.equal(data, null);  
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }
        
        onFinish(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });

  it('should prevent requesting a new round when not logged in (async)', function(done) {
    async.waterfall([
      function(callback) {
        var client = io.connect(socketURL, options);
        client.emit('requestStartNextRound', null);

        client.on('startNextRoundReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'User not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });

  it('should prevent requesting a new round when provided an invalid gameid (async)', function(done) {
    async.waterfall([
      signInMaker(user1),
      function(client, userInfo, callback) {
        client.emit('requestStartNextRound', null);

        client.on('startNextRoundReject', function(data) {
          callback(data, client);
        });
      }
      ], 
    function(err, client) {
      // data should contain an error message
      try {
        assert.equal(err.error, 'Game not found.');  
      } catch(e) {
        client.disconnect();
        done(e);
        return;
      }
      
      client.disconnect();
      done();
    });
  });


  it('should prevent requesting a new round when the game is not ready (async)', function(done) {
    var numWaitingForCards = 0;
    var numShown = 0;

    var onFinish = function(callbackData) {
      callbackData['connections'].forEach(function(cl) {
        cl.client.disconnect();
      });
    };

    var listeners = {
      'startConfirm': startConfirmDefault,
      'joinConfirm': joinConfirmDefault,
      'gameCanStart': gameCanStartDefault,
      'yourTurnToChoose': function(client, userInfo, data, callbackData, key) {
        client.emit('requestStartNextRound', null);
      },
      'startNextRoundReject': function(client, userInfo, data, callbackData, key) {
        // data: { error: 'Game not ready to start a new round.' }
        try {
          assert.equal(data.error, 'Game not ready to start a new round.');
        } catch(e) {
          onFinish(callbackData);
          done(e);
          return;
        }
        
        onFinish(callbackData);
        done();
      }
    };

    async.waterfall([
      createGameMaker(user1, listeners),
      joinGameMaker(user2, listeners),
      joinGameMaker(user3, listeners),
      ], 
    function(err, client, userInfo, callbackData) {
    });
  });



  it('should prevent other players from starting a new round', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var usersToAnswer = [];
    var clientToChoose;

    var startNextRoundPromptCallback = function(data) {
      // data: null
      clientToChoose.emit('requestStartNextRound', null);
    };

    var startNextRoundRejectCallback = function(data) {
      assert.equal(data.error, 'Only the player whose turn is currently active may request a new round.');

      for (var key in clientsConnected) {
        // cleanup and end
        clientsConnected[key].client.disconnect();      
      }
      
      done();
    };

    var yourTurnToChooseCallback = function(data) {
      var client = this;
      clientToChoose = client;
    };

    var chooseCardCallback = function(data) {
      clientToChoose.emit('chooseAnswer', {card: data.cards[0]});
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      usersToAnswer.push(client);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;
      clientsConnected[client.io.engine.id].cards.push(data);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // wait until all 3 get the initial callback
      if (numWaitingForCards >= 3) {
        // submit the cards
        if (data.numPlayers === 2 && !(usersToAnswer[0].answered)) {
          usersToAnswer[0].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[0].io.engine.id].cards[0]});
          usersToAnswer[0].answered = true;
        }
        if (data.numPlayers === 1 && !(usersToAnswer[1].answered)) {
          usersToAnswer[1].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[1].io.engine.id].cards[0]});
          usersToAnswer[1].answered = true;
        }
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('startNextRoundPrompt', startNextRoundPromptCallback);
      client.on('startNextRoundReject', startNextRoundRejectCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('startNextRoundPrompt', startNextRoundPromptCallback);
      client.on('startNextRoundReject', startNextRoundRejectCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should allow the active player to start a new round when the game is ready', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var usersToAnswer = [];
    var clientToChoose;

    var startNextRoundPromptCallback = function(data) {
      // data: null
      this.emit('requestStartNextRound', null);
    };

    var roundStartConfirmCallback = function(data) {
      // data: { question: { type: '(Pick 1)', value: 'Only two things in life are certain: death and _ .' }, playerTurn: { name: 'u2', id: 'ZqSM4Tn5ad' } }
      assert.equal(typeof data.question, 'object');
      assert.equal(typeof data.question.type, 'string');
      assert.equal(typeof data.question.value, 'string');

      assert.equal(typeof data.playerTurn, 'object');
      assert.equal(typeof data.playerTurn.name, 'string');
      assert.equal(typeof data.playerTurn.id, 'string');

      for (var key in clientsConnected) {
        // cleanup and end
        clientsConnected[key].client.disconnect();      
      }
      
      done();
    };

    var yourTurnToChooseCallback = function(data) {
      var client = this;
      clientToChoose = client;
    };

    var chooseCardCallback = function(data) {
      clientToChoose.emit('chooseAnswer', {card: data.cards[0]});
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      usersToAnswer.push(client);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;
      clientsConnected[client.io.engine.id].cards.push(data);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // wait until all 3 get the initial callback
      if (numWaitingForCards >= 3) {
        // submit the cards
        if (data.numPlayers === 2 && !(usersToAnswer[0].answered)) {
          usersToAnswer[0].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[0].io.engine.id].cards[0]});
          usersToAnswer[0].answered = true;
        }
        if (data.numPlayers === 1 && !(usersToAnswer[1].answered)) {
          usersToAnswer[1].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[1].io.engine.id].cards[0]});
          usersToAnswer[1].answered = true;
        }
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('startNextRoundPrompt', startNextRoundPromptCallback);
      client.on('roundStartConfirm', roundStartConfirmCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('startNextRoundPrompt', startNextRoundPromptCallback);
      client.on('roundStartConfirm', roundStartConfirmCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should remove a submitted answer when a player disconnects', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var usersToAnswer = [];
    var clientToChoose;

    var chooseCardCallback = function(data) {
      if (data.cards.length === 2) {
        for (var key in clientsConnected) {
          // cleanup and end
          clientsConnected[key].client.disconnect();      
        }
        
        done();
      }
    };

    var yourTurnToChooseCallback = function(data) {
      var client = this;
      clientToChoose = client;
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      usersToAnswer.push(client);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;
      clientsConnected[client.io.engine.id].cards.push(data);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // wait until all 4 get the initial callback
      if (numWaitingForCards >= 4) {
        // submit the cards
        if (data.numPlayers === 3 && !(usersToAnswer[0].answered)) {
          usersToAnswer[0].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[0].io.engine.id].cards[0]});
          usersToAnswer[0].answered = true;
        }
        if (data.numPlayers === 2 && !(usersToAnswer[1].answered)) {
          usersToAnswer[1].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[1].io.engine.id].cards[0]});
          usersToAnswer[1].answered = true;
        }
        if (data.numPlayers === 1 && !(usersToAnswer[2].answered)) {
          usersToAnswer[2].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[2].io.engine.id].cards[0]});
          usersToAnswer[2].answered = true;

          usersToAnswer[0].disconnect();
          delete clientsConnected[usersToAnswer[0].io.engine.id];
        }
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);


      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
      joinGame(user4, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('chooseCard', chooseCardCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {});
      }
    }

    createGame(user1, createCallback, null, null);
  });

});