'use strict';

var should = require('should'),
    GameBoard = require('../../../server/models/game_board');
var assert = require('assert');
var Promise = require('node-promise');

describe('Game board class', function() {
  beforeEach(function(){
    var testBoard = new GameBoard();
    this.testBoard = testBoard;
  });

  it('should create a new game board object', function(done) {
    var testBoard = this.testBoard;

    assert.equal(testBoard.question, undefined);
    assert.equal(testBoard.answers.length, 0);
    assert.equal(testBoard.startingCards, 7);

    // Create an array of promises to hold the promises for the async reads
    var promises = [];
    promises.push(testBoard.answerpromise);
    promises.push(testBoard.questionpromise);

    Promise.all(promises).then(function(results) {
      assert.equal(typeof testBoard.answer_cards, 'object');
      assert.equal(typeof testBoard.question_cards, 'object');
      assert.notEqual(testBoard.question, undefined);

      done();
    }, function(error) {
      console.log("Error reading files");
      done(error);
    });
    
  });

  it('should allow users to submit an answer', function() {
    var testBoard = this.testBoard;
    assert.equal(testBoard.answers.length, 0);
    testBoard.submitAnswer({type:'Answer', value: 'Test123'});
    assert.equal(testBoard.answers.length, 1);
  });

  it('should allow users to get the next question', function(done) {
    var testBoard = this.testBoard;

       // Create an array of promises to hold the promises for the async reads
    var promises = [];
    promises.push(testBoard.answerpromise);
    promises.push(testBoard.questionpromise);

    Promise.all(promises).then(function(results) {
      var currentQuestion = testBoard.question;
      testBoard.getNextQuestion();
      assert.notEqual(testBoard.question, currentQuestion);

      done();
    }, function(error) {
      console.log("Error reading files");
      done(error);
    });
  });

  it('should allow users to draw cards', function(done) {
    var testBoard = this.testBoard;

       // Create an array of promises to hold the promises for the async reads
    var promises = [];
    promises.push(testBoard.answerpromise);
    promises.push(testBoard.questionpromise);

    Promise.all(promises).then(function(results) {
      var startingAnswerLength = testBoard.answer_cards.undrawn.length;
      var card1 = testBoard.drawCard();
      
      // verify cards were drawn
      assert.equal(testBoard.answer_cards.undrawn.length, startingAnswerLength - 1);
      assert.equal(typeof card1, 'object');
      assert.equal(testBoard.answer_cards.playercards.length, 1);

      done();
    }, function(error) {
      console.log("Error reading files");
      done(error);
    });
  });

  it('should allow users to start the next round', function(done) {
    var testBoard = this.testBoard;

       // Create an array of promises to hold the promises for the async reads
    var promises = [];
    promises.push(testBoard.answerpromise);
    promises.push(testBoard.questionpromise);

    Promise.all(promises).then(function(results) {
      var startingAnswerLength = testBoard.answer_cards.undrawn.length;
      var initialQuestion = testBoard.question;
      var initialQuestionCount = testBoard.question_cards.undrawn.length;

      // draw some cards
      var cards = [];
      var numCards = 5;
      for (var i = 0; i < numCards; i++) {
        cards.push(testBoard.drawCard());  
      }
  
      // verify cards were drawn
      assert.equal(testBoard.answer_cards.undrawn.length, startingAnswerLength - numCards);
      assert.equal(typeof cards[0], 'object');
      assert.equal(testBoard.answer_cards.playercards.length, numCards);

      // submit the cards
      while (cards.length > 0) {
        testBoard.submitAnswer(cards.pop());
      }

      // verify cards were submitted
      assert.equal(testBoard.answers.length, numCards);
      assert.equal(cards.length, 0);
      assert.equal(testBoard.answer_cards.playercards.length, numCards);

      // start the next round
      testBoard.nextRound();

      // verify everything is ready for the next round...
      assert.notEqual(testBoard.question, initialQuestion);
      assert.equal(testBoard.answers.length, 0);
      assert.equal(testBoard.answer_cards.playercards.length, 0);
      assert.equal(testBoard.question_cards.playercards.length, 1);
      assert.equal(testBoard.question_cards.undrawn.length, initialQuestionCount - 1);

      done();
    }, function(error) {
      console.log("Error reading files");
      done(error);
    });
  });
  
});