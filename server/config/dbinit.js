'use strict';

var fs = require('fs');
var mongoose = require('mongoose');

var Answer = require('../models/db/answer.model');
var Question = require('../models/db/question.model');

// Collections are required here so that they can be dropped
var AnswerDeck = require('../models/db/answerDeck.model');
var QuestionDeck = require('../models/db/questionDeck.model');
var Game = require('../models/db/game.model');
var Session = require('../models/db/session.model');
var Socket = require('../models/db/socket.model');
var UserGameState = require('../models/db/userGameState.model');

var collectionsToWipe = 'AnswerDeck Game QuestionDeck Session Socket UserGameState'.split(' ');

console.log('Initializing database.');
console.log('Clearing transient collections.');

var dropCallback = function(err) {
  console.log('removing collection');
};

// scan the collections, clearing the transient ones
for (var key in mongoose.models) { 
  if (collectionsToWipe.indexOf(key) !== -1) {
    mongoose.models[key].remove({}, dropCallback);
  }
}

console.log('Verifying Answer collection.');
// read the answers file from the FS
fs.readFile('./server/data/answers.json', {encoding: 'UTF-8'}, function(error, data) {
  if (error) {
    console.log(error);
  }
  else {
    var answersFromFile = JSON.parse(data).answers;
    console.log('Found %s answers in FS', answersFromFile.length);

    // check the db for answers
    Answer.find({}, function(err, answers) {
      console.log('Found %s answers in DB', answers.length);

      // compare the db list size with the fs list size
      if (answers.length !== answersFromFile.length) {
        // dump the current contents
        Answer.remove({}, function(err) { 
          console.log('Wiping Answer collection from the database.');

          // restore the docs from the FS content
          console.log('Adding answers from filesystem.');
          answersFromFile.forEach(function(a) {
            var newAnswer = new Answer(a);
            newAnswer.save();
          });
        });
      }
    });
  }
});

console.log('Verifying Question collection.');
// read the questions file from the FS
fs.readFile('./server/data/questions.json', {encoding: 'UTF-8'}, function(error, data) {
  if (error) {
    console.log(error);
  }
  else {
    var questionsFromFile = JSON.parse(data).questions;
    console.log('Found %s questions in FS', questionsFromFile.length);

    // check the db for questions
    Question.find({}, function(err, questions) {
      console.log('Found %s questions in DB', questions.length);

      // compare the db list size with the fs list size
      if (questions.length !== questionsFromFile.length) {
        // dump the current contents
        Question.remove({}, function(err) { 
          console.log('Wiping Question collection from the database.');

          // restore the docs from the FS content
          console.log('Adding questions from filesystem.');
          questionsFromFile.forEach(function(q) {
            var newQuestion = new Question(q);
            newQuestion.save();
          });
        });
      }
    });
  }
});
