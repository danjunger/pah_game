'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var QuestionSchema = new Schema({
  type: String,
  value: String
});

module.exports = mongoose.model('Question', QuestionSchema);
