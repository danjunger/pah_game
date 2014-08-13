var fs = require('fs');
var Deck = require('./deck');
var Promise = require('node-promise').Promise;

function GameBoard () {
  this.question = undefined;
  this.answers = [];
  this.startingCards = 7;
  this.decksReady = 0;

  //var answer_cards, question_cards;

  var loadCards = function() {
    var that = this;

    that.answerpromise = new Promise();
    fs.readFile('./server/data/answers.json', {encoding: 'UTF-8'}, function(error, data) {
      if (!error) {
        // resolve promise
        that.answerpromise.resolve();

        // do stuff
        that.answer_cards = new Deck(JSON.parse(data).answers);
        that.answer_cards.shuffle();

        that.decksReady++;
      }
    });

    that.questionpromise = new Promise();
    that.question_cards = fs.readFile('./server/data/questions.json', {encoding: 'UTF-8'}, function(error, data) {
      if (!error) {
        // resolve promise
        that.questionpromise.resolve();

        // do stuff
        that.question_cards = new Deck(JSON.parse(data).questions);
        that.question_cards.shuffle();

        that.getNextQuestion();

        that.decksReady++;
      }
    });
  };
  loadCards.call(this);
}

GameBoard.prototype.submitAnswer = function(answer) {
  this.answers.push(answer);
};

GameBoard.prototype.getNextQuestion = function() {
  this.question = this.question_cards.next();
};

GameBoard.prototype.drawCard = function() {
  return this.answer_cards.draw();
};

GameBoard.prototype.nextRound = function() {
  if (this.decksReady !== 2) {
    setTimeout(this.nextRound, 1000);
    return;
  }
  // store the black card in the user list
  this.question_cards.playercards.push(this.question);
  
  // get the next question
  this.getNextQuestion();

  // discard the answers from this round
  for (var i = 0; i < this.answers.length; i++) {
    //delete this.answers[i].player;
    //this.answer_cards.discard(this.answers[i].card);
    this.answer_cards.discard(this.answers[i]);
  }

  this.answers = [];
};

module.exports = GameBoard;
