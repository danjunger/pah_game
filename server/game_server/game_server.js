var _ = require('underscore');
var Game = require('../models/game');
var Player = require('../models/player');
var Session = require('../models/session/session.model');


function GameServer (socketio) {
  var server = this;
  var socketTimeoutDelay = 1000 * 30; // 30 sec

  server.users = [];
  server.games = [];
  server.sockets = [];

  server.io = socketio;

  /** Socket.io events **/
  server.io.sockets.on('connection', function (socket) {
    console.log('A new client has connected. This is connection ' + socket.id);
    server.sockets[socket.id] = socket;

    // prompt the client for a session token
    socket.emit('sessionLookup', null);

    // listen for a sessionLookResponse event
    socket.on('sessionLookResponse', function(data) {
      var sessionId = data.token;
      var existingSession;
console.log('looking up session ', data.token);
      Session.findOne({token: data.token}, function(err, session) {
        if (err) {
          console.log('blew up looking for session in lookup');
        }
        // session found, update it and update the references to its socket
        else if (session) {
          var oldSocketId = session.socketId;

          // save the new socketId in the session
          session.socketId = socket.id;
          session.save(function(err, session) {
            if (err) {
              console.log('blew up saving the session with the socketid in lookup');
            }
            else {
              console.log('saved session in lookup');
            }
          });

          // if the old socket is still connected, disconnect it
          if (server.sockets[oldSocketId]) {
            server.sockets[oldSocketId].disconnect();

            // and delete its ref in the socket list
            delete server.sockets[oldSocketId];
          }

          // update references to the old socket...

          // if the old socket exists in the game server
          if (server.users[oldSocketId]) {
            // update socketId in player object
            server.users[oldSocketId].socketId = socket.id;

            // update server.users to point to the new socketId
            server.users[socket.id] = server.users[oldSocketId];

            // cleanup user and socket objects from the disconnected user
            delete server.users[oldSocketId];
          }
        }
      });
    });

    // SIGN ON
    socket.on('signIn', function(data) {
      // data: name
      var user = new Player(data.username, socket.id);
      
      // add the socket.id into the DB session object
      Session.findOne({username: data.username}, function(err, session) {
        if (err) {
          console.log('blew up looking for session');
        }
        else {
          console.log('found session');
          session.socketId = socket.id;
          session.save(function(err, session) {
            if (err) {
              console.log('blew up saving the session with the socketid');
            }
            else {
              console.log('saved session');
            }
          });
        }
      });

      user.authenticated = true;
      server.users[socket.id] = user;
      socket.emit('signInConfirm', user);
    });
    // SIGN ON


    // STARTING A GAME AND JOINING A GAME
    socket.on('requestStart', function(data) {
      // data: {}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('startReject', {error: 'User not authenticated.'});
        return;
      }

      var newGame = new Game();
      var serverUser = server.users[user.socketId];
      serverUser.gameId = newGame.id;
      newGame.addPlayer(serverUser);
      server.games[newGame.id] = newGame;

      socket.emit('startConfirm', {startConfirm:true, id: newGame.id, players: server.getBasicPlayerInfo(newGame.id)});
      server.updatePlayers(newGame.id);
    });

    socket.on('requestJoin', function(data) {
      // data: {gameId: shortGameId}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('joinReject', {error: 'User not authenticated.'});
        return;
      }

      var userGame = server.findGameById(data.gameId);
      if (!userGame) {
        socket.emit('joinReject', {error: 'Game not found.'});
        return;
      }

      user.gameId = userGame.id;      
      userGame.addPlayer(user);
      socket.emit('joinConfirm', {id: userGame.id, players: server.getBasicPlayerInfo(userGame.id)});
      server.updatePlayers(userGame.id);

      // when more than 2 people have connected, emit a message to player 1 letting them know they can now start the game
      if (userGame.players.length > 2) {
        server.sockets[userGame.players[0].socketId].emit('gameCanStart', {id: userGame.id, players: server.getBasicPlayerInfo(userGame.id)});
      }
    });
    // STARTING A GAME AND JOINING A GAME


    socket.on('requestGameStart', function(data) {
      // data: {}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('gameStartReject', {error: 'User not found.'});  
        return;  
      }

      var userGame = server.findGameById(user.gameId);
      if (!userGame) {
        socket.emit('gameStartReject', {error: 'Game not found.'});
        return;
      }

      // check that the user is the owner of the game
      if (user !== userGame.players[0]) {
        socket.emit('gameStartReject', {error: 'Only the game owner may start the game.'});
        return;
      }

      // check that the game has the minimum number of players
      if (userGame.players.length < 3) {
        socket.emit('gameStartReject', {error: 'Game must have at least three players to start.'});
        return;
      }

      // TODO: check that the game is not currently in progress

      userGame.chooseRandomPlayer();
      var playerWhoseTurn = userGame.getPlayerForTurn();
      var minplayerWhoseTurn = playerWhoseTurn.minimumUser();

      // alert each player that the game is starting
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('gameStartConfirm', {question: userGame.game_board.question, playerTurn: minplayerWhoseTurn});
      });

      // alert the player whose turn it is to go first
      server.sockets[playerWhoseTurn.socketId].emit('yourTurnToChoose', null);

      // alert other players it is their turn to submit a card
      var otherPlayers = _.without(userGame.players, playerWhoseTurn);
      otherPlayers.forEach(function(p) {
        server.sockets[p.socketId].emit('yourTurnToAnswer', null);
      });

      var dealCard = function(p) {
        var card = userGame.game_board.drawCard();
        p.gameObj.addCard(card);
        server.sockets[p.socketId].emit('cardDrawn', card);
      };

      // deal out cards to each player
      for (var i = 0; i < userGame.game_board.startingCards; i++) {
        // deal out one card at a time to each player
        userGame.players.forEach(dealCard);          
      }

      // set the game ready to receive cards
      userGame.acceptCards = true;

      // alert everyone how many players still need to submit a card (everyone)
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('waitingForCards', {numPlayers: userGame.players.length - 1});
      });
    });

    socket.on('submitCardRequest', function(data) {
      // data: {card: card}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('submitCardReject', {error: 'User not found.'});
        return;  
      }

      var userGame = server.findGameById(user.gameId);
      if (!userGame) {
        socket.emit('submitCardReject', {error: 'Game not found.'});
        return;
      }

      if (!userGame.acceptCards) {
        socket.emit('submitCardReject', {error: 'Game not ready for card submission.'});
        return;
      }

      // check that the user actually has the card they tried to submit..
      if (!server.findCardInPlayerHand(user, data.card)) {
        socket.emit('submitCardReject', {error: 'Invalid card submitted.'});
        return;
      }

      // check to see if this user has submitted a card already in this round
      var userHasSubmittedAlready = userGame.game_board.answers.filter(function(item) {
        return item.player === user;
      }).length === 0 ? false : true;

      if (userHasSubmittedAlready) {
        socket.emit('submitCardReject', {error: 'User has already submitted a card.'});
        return;
      }

      // add the card to the game object
      userGame.game_board.answers.push({card: data.card, player: user});

      var numPlayersLeft = (userGame.players.length - 1) - userGame.game_board.answers.length;

      // alert each player the number of other players who still need to submit a card
      if (numPlayersLeft > 0) {
        userGame.players.forEach(function(p) {
          server.sockets[p.socketId].emit('waitingForCards', {numPlayers: numPlayersLeft});
        });
      }
      // send the cards to the chooser to pick and update the other players that they are now waiting on the chooser
      else {
        var playerWhoseTurn = userGame.getPlayerForTurn();
        var otherPlayers = _.without(userGame.players, playerWhoseTurn);

        // set the game not ready to receive cards
        userGame.acceptCards = false;

        // set the game ready to receive a choice
        userGame.acceptChoice = true;

        // filter the card data down to be shown to the players. map is used to remove the user info stored with the card objects.
        var cardsToShow = userGame.game_board.answers.map(function(item) {
          return item.card;
        });

        // send the chooser the list of cards.  
        server.sockets[playerWhoseTurn.socketId].emit('chooseCard', {cards: cardsToShow});

        otherPlayers.forEach(function(p) {
          server.sockets[p.socketId].emit('waitingForChooser', null);
          server.sockets[p.socketId].emit('showCards', {cards: cardsToShow});
        });
      }

      // send the player an update that their card was accepted and remove the card from their game object
      user.gameObj.removeCard(data.card);
      server.sockets[user.socketId].emit('submitCardConfirm', { accepted: true, card: data.card});

      // give this user a new card
      var card = userGame.game_board.drawCard();
      user.gameObj.addCard(card);
      server.sockets[user.socketId].emit('cardDrawn', card);
    });

    socket.on('chooseAnswer', function(data) {
      // data: {card: card}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('chooseAnswerReject', {error: 'User not found.'});
        return;  
      }

      var userGame = server.findGameById(user.gameId);
      if (!userGame) {
        socket.emit('chooseAnswerReject', {error: 'Game not found.'});
        return;
      }

      if (!userGame.acceptChoice) {
        socket.emit('chooseAnswerReject', {error: 'Game not yet ready for choice.'});
        return;
      }

      if (user !== userGame.getPlayerForTurn()) {
        socket.emit('chooseAnswerReject', {error: 'It is not the user\'s turn to choose.'});
        return;
      }

      // set the game not ready for a choice
      userGame.acceptChoice = false;

      // look up the winner
      var result;
      userGame.game_board.answers.forEach(function(c) {
        if (c.card.type === data.card.type && c.card.value === data.card.value) {
          result = c;
        }
      });

      if (result === undefined) {
        socket.emit('chooseAnswerReject', {error: 'Invalid card choice.'});
        return;
      }

      var winner = result.player;

      // remove the player reference on the card
      delete result.player;
      result = result.card;

      // update the score
      winner.gameObj.addVictoryCard(result);

      // gather up the scores
      var scores = userGame.players.map(function(p) {
        var min = p.minimumUser();
        min.score = p.gameObj.victoryCards.length;
        return min;
      });

      // send confirmation to the chooser
      server.sockets[user.socketId].emit('chooseConfirm', null);

      // broadcast the result to everyone
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('cardChosen', {card: result, winner: winner.minimumUser()});
      });

      // broadcast the score out to everyone
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('scoreUpdate', scores);
      });

      // advance the game to the next round
      userGame.nextTurn();

      // set the game able to start a new round
      userGame.canStartNextRound = true;

      // alert the player choosing the next round that they need to click something to advance the game
      var nextPlayer = userGame.getPlayerForTurn();
      server.sockets[nextPlayer.socketId].emit('startNextRoundPrompt', null);
    });

    socket.on('revealCard', function(data) {
      // data: {type: 'Answer', value: 'Some clever card'}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('revealCardReject', {error: 'User not found.'});
        return;  
      }

      var userGame = server.findGameById(user.gameId);
      if (!userGame) {
        socket.emit('revealCardReject', {error: 'Game not found.'});
        return;
      }

      // emit the cardRevealed event to all the other players
      var otherPlayers = _.without(userGame.players, user);
      otherPlayers.forEach(function(p) {
        server.sockets[p.socketId].emit('cardRevealed', data);
      });
    });

    socket.on('requestStartNextRound', function(data) {
      // data: {}
      var user = server.users[socket.id];
      if (!user) {
        socket.emit('startNextRoundReject', {error: 'User not found.'});
        return;  
      }

      var userGame = server.findGameById(user.gameId);
      if (!userGame) {
        socket.emit('startNextRoundReject', {error: 'Game not found.'});
        return;
      }

      if (!userGame.canStartNextRound) {
        socket.emit('startNextRoundReject', {error: 'Game not ready to start a new round.'});
        return;
      }

      if (user !== userGame.getPlayerForTurn()) {
        socket.emit('startNextRoundReject', {error: 'Only the player whose turn is currently active may request a new round.'});
        return;
      }      

      // set the game unable to start a new round
      userGame.canStartNextRound = false;

      var playerWhoseTurn = userGame.getPlayerForTurn();
      var minplayerWhoseTurn = playerWhoseTurn.minimumUser();

      // alert each player that a new round is starting
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('roundStartConfirm', {question: userGame.game_board.question, playerTurn: minplayerWhoseTurn});
      });

      // set the game ready to receive cards
      userGame.acceptCards = true;

      // alert the player whose turn it is to choose
      server.sockets[playerWhoseTurn.socketId].emit('yourTurnToChoose', null);

      // alert other players it is their turn to submit a card
      var otherPlayers = _.without(userGame.players, playerWhoseTurn);
      otherPlayers.forEach(function(p) {
        server.sockets[p.socketId].emit('yourTurnToAnswer', null);
      });

      // alert everyone how many players still need to submit a card (everyone)
      userGame.players.forEach(function(p) {
        server.sockets[p.socketId].emit('waitingForCards', {numPlayers: userGame.players.length - 1});
      });
    });


    // DISCONNECTION //
    socket.on('disconnect', function() {
      console.log('Connection ' + socket.id + ' has been disconnected.');
      var user = server.users[socket.id];

      // mark the user as disconnected if it was logged in
      if (user) {
        user.disconnected = true;
      }

      // set a timer to remove the socket references
      setTimeout(function() {
console.log('cleaning up old socket references for ' + socket.id);

        // check the socketId reference on the user to see if they have reconnected with a new socketid

        // user has a new socket id, dont wipe their game, just remove the old socketid
        if (user && user.socketId !== socket.id) {
          console.log('user for socket %s has returned, nothing to do', socket.id);
        }

        // user did not reconnect, wipe them out
        else {
          console.log('user for socket %s did not return, cleaning up', socket.id);

        // remove user from any game they might be in
          if (user && user.gameId && user.gameId !== 0) {
            var game = server.games[user.gameId];
            var currentPlayerForTurn = game.getPlayerForTurn();
            game.removePlayer(user);

            // it is the user who left turn
            if (user === currentPlayerForTurn) {
              // enough players to continue
              if (game.players.length > 2) {
                // advance the game to the next round
                game.nextTurn();

                // set the game able to start a new round
                game.canStartNextRound = true;

                // alert the players that this round is being skipped
                game.players.forEach(function(p) {
                  server.sockets[p.socketId].emit('skipRound', null);
                });

                // alert the player choosing the next round that they need to click something to advance the game
                var nextPlayer = game.getPlayerForTurn();
                server.sockets[nextPlayer.socketId].emit('startNextRoundPrompt', null);
              }
              // not enough players to continue
              else {
      console.log('player turn left, not enough to continue');
              }
            }
            // not this user's turn
            else {
              // enough players to continue, retract the players card if submitted
              if (game.players.length > 2) {
                var departingPlayerCardIndex = -1;
                for (var i = 0; i < game.game_board.answers.length; i++) {
                  if (game.game_board.answers[i].player === user) {
                    departingPlayerCardIndex = i;
                    break;
                  }
                }
                // if the index exists (card found), splice it out
                if (departingPlayerCardIndex !== -1) {
                  game.game_board.answers.splice(departingPlayerCardIndex, 1);

                  var cardsToShow = game.game_board.answers.map(function(item) {
                    return item.card;
                  });

                  // check that the game is ready for a choice prior to sending an updated list
                  if (game.acceptChoice) {
                  // send the chooser the updated list of cards.
                    server.sockets[game.getPlayerForTurn().socketId].emit('chooseCard', {cards: cardsToShow});
                  }
                }
              }
              // not enough players to continue, start a new round and wait for more players
              else {
      console.log('player left, not enough to continue');
                
              }
            }

            // delete the game when the last player leaves
            if (game.players.length === 0) {
              delete server.games[user.gameId];
            }
            // game not empty, broadcast an update to the players who are still connected
            else {
              server.updatePlayers(user.gameId);
            }
          }

          // cleanup user and socket objects from the disconnected user
          delete server.users[socket.id];
          delete server.sockets[socket.id];

        }

      }, socketTimeoutDelay);


    });
    // DISCONNECTION //
  });
}

GameServer.prototype.findGameById = function(gameId) {
  return this.games[gameId];
};

GameServer.prototype.getBasicPlayerInfo = function(gameId) {
  var players = this.games[gameId].players;
  var playerData = players.map(function(p) {
    return p.minimumUser();
  });

  return playerData;
};

GameServer.prototype.updatePlayers = function(gameId) {
  var playersToUpdate = this.games[gameId].players;
  var playerData = this.getBasicPlayerInfo(gameId);

  var server = this;

  playersToUpdate.forEach(function(player) {
    var socket = server.sockets[player.socketId];

    // do stuff on each socket
    if (socket !== undefined) {
      socket.emit('playerUpdate', {players: playerData});
    }
  });
};

GameServer.prototype.findCardInPlayerHand = function(player, card) {
  return _.find(player.gameObj.hand, function(item) {
    return item.value === card.value;
  }) === undefined ? false : true;
};

module.exports = GameServer;
