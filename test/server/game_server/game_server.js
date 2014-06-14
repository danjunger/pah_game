var should = require('should');
var io = require('socket.io-client');
var assert = require('assert');

var socketURL = 'ws://localhost:9000';

var options = {
  transports: ['websocket'],
  'forceNew': true
};

var user1 = {'name':'u1'};
var user2 = {'name':'u2'};
var user3 = {'name':'u3'};

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

describe("Game Server",function(){
  
  it('should sign in on connection', function(done) {
    var cb = function(client, userInfo) {
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
    };

    signIn(user1, cb);
  });

  it('should fail to create a game when not authenticated', function(done) {
    var startNoAuthCallback = function(client) {
      client.emit('requestStart', user1);

      client.on('startReject', function(data) {
        // data should contain an error message
        assert.equal(data.error, 'User not authenticated.');

        client.disconnect();
        done();
      });
    };

    connectToServer(startNoAuthCallback);
  });

  it('should fail to join a game when not authenticated', function(done) {
    var joinNoAuthCallback = function(client) {
      client.emit('requestJoin', {user: user1, gameId: 'asdf'});

      client.on('joinReject', function(data) {
        // data should contain an error message
        assert.equal(data.error, 'User not authenticated.');

        client.disconnect();
        done();
      });
    };

    connectToServer(joinNoAuthCallback);
  });

  it('should fail to join a game whose id does not exist', function(done) {
    var joinNoGameIdCallback = function(client, userInfo) {
      client.emit('requestJoin', {user: userInfo, gameId: 'asdf'});

      client.on('joinReject', function(data) {
        // data should contain an error message
        assert.equal(data.error, 'Game not found.');

        client.disconnect();
        done();
      });
    };

    signIn(user1, joinNoGameIdCallback);
  });

  it('should be able to create a game', function(done) {
    var createCallback = function(client, userInfo, gameInfo) {
      // data: {id: newGame.id, players: server.getBasicPlayerInfo(newGame.id)}
      assert.equal(gameInfo.id.length, 5);
      assert.equal(gameInfo.players.length, 1);
      assert.equal(gameInfo.players[0].name, user1.name); 
    };
    var playerUpdateCallback = function(client, userInfo, update) {
      assert.equal(update.players.length, 1);
      assert.equal(update.players[0].name, user1.name);

      client.disconnect();
      done();
    };

    createGame(user1, createCallback, playerUpdateCallback);
  });

  it('should be able to join a game', function(done) {
    var client2joined = false;

    var joinCallback = function(client, userInfo, data) {
      // data: { id: 'visdg', players: [ { name: 'u1', id: 'vJgUcyPNSH' },{ name: 'u2', id: 'u2lwOyb8VG' } ] }
      assert.equal(data.players.length, 2);
      assert.equal(data.players[0].name, user1.name);
      assert.equal(data.players[1].name, user2.name);

      // set the client2joined flag to be true since both users have joined
      client2joined = true;
    };

    var joinUpdateCallback = function(client, userInfo, update) {
      assert.equal(update.players.length, 2);
      assert.equal(update.players[0].name, user1.name);
      assert.equal(update.players[1].name, user2.name);

      // client2 disconnects first
      client.disconnect();
    };

    var user1UpdateCallback = function(client, userInfo, update) {      
      // on the update when client2 initially joins the game
      if (update.players.length == 1 && !client2joined) {
        assert.equal(update.players.length, 1);
        assert.equal(update.players[0].name, user1.name);
      }

      // on the update where client2 has joined
      if (update.players.length == 2 && client2joined) {
        assert.equal(update.players.length, 2);
        assert.equal(update.players[0].name, user1.name);
        assert.equal(update.players[1].name, user2.name);
      }

      // on the update where client2 has disconnected, disconnect client1 and end the test case
      if (update.players.length == 1 && client2joined) {
        // disconnect client1
        client.disconnect();
        done();
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      joinGame(user2, gameInfo.id, joinCallback, joinUpdateCallback);
    };

    createGame(user1, createCallback, user1UpdateCallback);
  });

  it('should alert player 1 when the game may be started', function(done) {
    var clientsConnected = [];

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});
    }

    var gameCanStartCallback = function(client, userInfo, data) {
      assert(data.id.length, 5);
      assert(data.players.length > 2, true);

      // disconnect everyone and end the test
      clientsConnected.forEach(function(c) {
        c.client.disconnect();
      });
      
      done();
    };

    createGame(user1, createCallback, null, gameCanStartCallback);
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

  it('should not allow game to start when provided an invalid gameid', function(done) {
    var cb = function(client, userInfo) {
      client.emit('requestGameStart', {user: userInfo, gameId: '123'});

      client.on('gameStartReject', function(data) {
        assert.equal(data.error, 'Game not found.');

        client.disconnect();
        done();
      });
    };

    signIn(user1, cb);
  });

  it('should not allow game to start when requested by an un-authenticated user', function(done) {
    var cb = function(client, userInfo) {
      client.emit('requestGameStart', {user: user1, gameId: '123'});

      client.on('gameStartReject', function(data) {
        assert.equal(data.error, 'User not found.');

        client.disconnect();
        done();
      });
    };

    connectToServer(cb);
  });

  it('should not allow game to start when there are less than 3 players connected', function(done) {
    var clientsConnected = [];

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      // receive the reject message
      client.on('gameStartReject', function(data) {
        assert.equal(data.error, 'Game must have at least three players to start.');

        // disconnect everyone and end the test
        clientsConnected.forEach(function(c) {
          c.client.disconnect();
        });
        
        done();
      });

      joinGame(user2, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      if (clientsConnected.length == 2) {
        clientsConnected[0].client.emit('requestGameStart', {user: clientsConnected[0].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should not allow game to be started by anyone other than the creator of the game', function(done) {
    var clientsConnected = [];

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected.push({client: client, user: userInfo});

      // receive the reject message
      client.on('gameStartReject', function(data) {
        assert.equal(data.error, 'Only the game owner may start the game.');

        // disconnect everyone and end the test
        clientsConnected.forEach(function(c) {
          c.client.disconnect();
        });
        
        done();
      });

      if (clientsConnected.length == 2) {
        clientsConnected[1].client.emit('requestGameStart', {user: clientsConnected[0].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should allow a game to be started!', function(done) {
    var clientsConnected = [];
    var numStartConfirm = 0;
    var numWaitingForCards = 0;
    var firstClient;
    var startConfirmUserToChoose;

    var gameStartConfirmCallback = function(data) {
      // { question: { type: '(Pick 1)', value: 'What\'s there a ton of in heaven?' }, playerTurn: { name: 'u3', id: 'E8CFBMbKoD' } }
      assert.equal(typeof data.question.type, 'string');
      assert.equal(typeof data.question.value, 'string');

      assert.equal(typeof data.playerTurn.name, 'string');
      assert.equal(typeof data.playerTurn.id, 'string');
      assert.equal(data.playerTurn.id.length, 10);

      numStartConfirm++;
      startConfirmUserToChoose = data.playerTurn;
    };

    var yourTurnToChooseCallback = function(data) {
      var client = this;
      assert.equal(clientsConnected[client.io.engine.id].user.name, startConfirmUserToChoose.name);
      assert.equal(clientsConnected[client.io.engine.id].user.id, startConfirmUserToChoose.id);
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      assert.notEqual(clientsConnected[client.io.engine.id].user.name, startConfirmUserToChoose.name);
      assert.notEqual(clientsConnected[client.io.engine.id].user.id, startConfirmUserToChoose.id);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;

      assert.equal(data.type, 'Answer');
      assert.equal(typeof data.value, 'string');

      clientsConnected[client.io.engine.id].cards.push(data);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // since this is the last callback, when count is 3 it will be the final callback of the test case
      if (numWaitingForCards === 3) {
        assert.equal(data.numPlayers, 2);
        assert.equal(numStartConfirm, 3);

        // verify we have 3 unique clients
        assert.equal(Object.keys(clientsConnected).length, 3);
        for (var key in clientsConnected) {
          // verify each client has 7 cards
          assert.equal(clientsConnected[key].cards.length, 7);

          clientsConnected[key].client.disconnect();      
        }
        
        done();
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('gameStartConfirm', gameStartConfirmCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};

      client.on('gameStartConfirm', gameStartConfirmCallback);
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {user: clientsConnected[firstClient.io.engine.id].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should prevent card submission when not logged in', function(done) {
    var cb = function(client, userInfo) {
      client.emit('submitCardRequest', {user: user1, gameId: '123', card: { type: 'Answer', value: 'A disappointing birthday party.' }});

      client.on('submitCardReject', function(data) {
        assert.equal(data.error, 'User not found.');

        client.disconnect();
        done();
      });
    };

    connectToServer(cb);
  });

  it('should prevent card submission when provided an invalid gameid', function(done) {
    var cb = function(client, userInfo) {
      client.emit('submitCardRequest', {user: user1, gameId: '123', card: { type: 'Answer', value: 'A disappointing birthday party.' }});

      client.on('submitCardReject', function(data) {
        assert.equal(data.error, 'Game not found.');

        client.disconnect();
        done();
      });
    };

    signIn(user1, cb);
  });

  it('should prevent card submission when provided a malformed gameid', function(done) {
    var cb = function(client, userInfo) {
      client.emit('submitCardRequest', {user: user1, gameId: null, card: { type: 'Answer', value: 'A disappointing birthday party.' }});

      client.on('submitCardReject', function(data) {
        assert.equal(data.error, 'Game not found.');

        client.disconnect();
        done();
      });
    };

    signIn(user1, cb);
  });

  it('should prevent card submission when the game is not ready', function(done) {
    var createCallback = function(client, userInfo, gameInfo) {
      joinGame(user2, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      client.emit('submitCardRequest', {user: user1, gameId: gameInfo.id, card: { type: 'Answer', value: 'A disappointing birthday party.' }});

      client.on('submitCardReject', function(data) {
        assert.equal(data.error, 'Game not ready for card submission.');

        client.disconnect();
        done();
      });
    }

    createGame(user1, createCallback, null, null);
  });

  it('should allow players to submit cards', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var userToChoose;
    var usersToAnswer = [];
    var cardsDealt = 0;


    var yourTurnToChooseCallback = function(data) {
      var client = this;
      var userToChoose = client;
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      usersToAnswer.push(client);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;
      clientsConnected[client.io.engine.id].cards.push(data);
      cardsDealt++;
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

    var submitCardConfirmCallback = function(data) {
      // { accepted: true, card: { type: 'Answer', value: 'Tiny nipples.' } }
      assert.equal(data.accepted, true);
      assert.equal(data.card.type, 'Answer');
      assert.equal(typeof data.card.value, 'string');
    };

    var chooseCardCallback = function(data) {
      // { cards: [ { type: 'Answer', value: 'My manservant, Claude.' }, { type: 'Answer', value: 'That thing that electrocutes your abs.' } ] }
      assert.equal(data.cards.length, 2);
      assert.equal(typeof data.cards[0], 'object');
      assert.equal(typeof data.cards[1], 'object');

      for (var key in clientsConnected) {
        // cleanup and end
        clientsConnected[key].client.disconnect();      
      }
      
      done();
    };

    var waitingForChooserCallback = function(data) {
      // null
      assert.equal(data, null);
    };

    var showCardsCallback = function(data) {
      // { cards: [ { type: 'Answer', value: 'My manservant, Claude.' }, { type: 'Answer', value: 'That thing that electrocutes your abs.' } ] }
      assert.equal(data.cards.length, 2);
      assert.equal(typeof data.cards[0], 'object');
      assert.equal(typeof data.cards[1], 'object');
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardConfirm', submitCardConfirmCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('waitingForChooser', waitingForChooserCallback);
      client.on('showCards', showCardsCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};

      
      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardConfirm', submitCardConfirmCallback);
      client.on('chooseCard', chooseCardCallback);
      client.on('waitingForChooser', waitingForChooserCallback);
      client.on('showCards', showCardsCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {user: clientsConnected[firstClient.io.engine.id].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should prevent players from submitting invalid cards', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var usersToAnswer = [];

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      usersToAnswer.push(client);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // wait until all 3 get the initial callback
      if (numWaitingForCards >= 3) {
        // submit the cards
        if (data.numPlayers === 2 && !(usersToAnswer[0].answered)) {
          usersToAnswer[0].emit('submitCardRequest', {card: {type: 'Answer', value: 'I made this one up'} });
          usersToAnswer[0].answered = true;
        }
      }
    };

    var submitCardRejectCallback = function(data) {
      // { error: 'Invalid card submitted.' }
      assert.equal(data.error, 'Invalid card submitted.');

      for (var key in clientsConnected) {
        // cleanup and end
        clientsConnected[key].client.disconnect();      
      }
      
      done();
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardReject', submitCardRejectCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardReject', submitCardRejectCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {user: clientsConnected[firstClient.io.engine.id].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

  it('should prevent a player from submitting multiple cards', function(done) {
    var clientsConnected = [];
    var numWaitingForCards = 0;
    var firstClient;
    
    var usersToAnswer = [];

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
          usersToAnswer[0].emit('submitCardRequest', {card: clientsConnected[usersToAnswer[0].io.engine.id].cards[3]});
          usersToAnswer[0].answered = true;
        }
      }
    };

    var submitCardRejectCallback = function(data) {
      // { error: 'Invalid card submitted.' }
      assert.equal(data.error, 'User has already submitted a card.');

      for (var key in clientsConnected) {
        // cleanup and end
        clientsConnected[key].client.disconnect();      
      }
      
      done();
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardReject', submitCardRejectCallback);
      client.on('cardDrawn', cardDrawnCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('waitingForCards', waitingForCardsCallback);
      client.on('submitCardReject', submitCardRejectCallback);
      client.on('cardDrawn', cardDrawnCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {user: clientsConnected[firstClient.io.engine.id].user, gameId: gameInfo.id});
      }
    }

    createGame(user1, createCallback, null, null);
  });

/*
var clientsConnected = [];
    var numStartConfirm = 0;
    var numWaitingForCards = 0;
    var firstClient;
    var startConfirmUserToChoose;

    var clientToChoose;
    var clientsToAnswer = [];


    var yourTurnToChooseCallback = function(data) {
      var client = this;
      clientToChoose = client;
    };

    var yourTurnToAnswerCallback = function(data) {
      var client = this;
      clientsToAnswer.push(client);
    };

    var cardDrawnCallback = function(data) {
      // { type: 'Answer', value: 'A disappointing birthday party.' }
      var client = this;

      clientsConnected[client.io.engine.id].cards.push(data);
    };

    var waitingForCardsCallback = function(data) {
      // { numPlayers: 2 }
      numWaitingForCards++;

      // since this is the last callback, when count is 3 it will be the final callback of the test case
      if (numWaitingForCards === 3) {


        // verify we have 3 unique clients
        assert.equal(Object.keys(clientsConnected).length, 3);
        for (var key in clientsConnected) {
          // verify each client has 7 cards
          assert.equal(clientsConnected[key].cards.length, 7);

          clientsConnected[key].client.disconnect();      
        }
        
        done();
      }
    };

    var createCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};
      firstClient = client;

      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);

      joinGame(user2, gameInfo.id, joinCallback, null);
      joinGame(user3, gameInfo.id, joinCallback, null);
    };

    var joinCallback = function(client, userInfo, gameInfo) {
      // save the client refs to disconnect at the end of the test
      clientsConnected[client.io.engine.id] = {client: client, user: userInfo, cards: []};

      client.on('yourTurnToChoose', yourTurnToChooseCallback);
      client.on('yourTurnToAnswer', yourTurnToAnswerCallback);
      client.on('cardDrawn', cardDrawnCallback);
      client.on('waitingForCards', waitingForCardsCallback);

      if (Object.keys(clientsConnected).length == 3) {
        firstClient.emit('requestGameStart', {user: clientsConnected[firstClient.io.engine.id].user, gameId: gameInfo.id});
      }
    };

    var users = [user1, user2, user3];
    var callbacks = {
      '': function() {

      },

    };

    var startGame = function(users, callbacks) {
      var startConfirmCallback = function(client, userInfo, gameInfo) {
        for (var i = 1; i < users.length; i++) {
          joinGame2(users[i], gameInfo.id, callbacks);  
        }
      };

      callbacks['startConfirm'] = startConfirmCallback;

      createGame2(users[0], callbacks);
    };

    var createGame2 = function(user, callbacks) {
      var createGameCallback = function(client, userInfo) {
        for (var key in callbacks) {
          client.on(key, function(data) {
            if (typeof callbacks[key] == 'function') {
              callbacks[key](client, userInfo, data);
            }
          });
        }
      };

      signIn(user.name, createGameCallback);
    };

    var joinGame2 = function(user, gameId, callbacks) {
      var joinGameCallback = function(client, userInfo) {
        for (var key in callbacks) {
          client.on(key, function(data) {
            if (typeof callbacks[key] == 'function') {
              callbacks[key](client, userInfo, data);
            }
          });
        }

        client.emit('requestJoin', {user: userInfo, gameId: gameId});
      };

      signIn(user, joinGameCallback);    
    };

*/

});