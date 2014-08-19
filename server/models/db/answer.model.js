'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AnswerSchema = new Schema({
  type: String,
  value: String
});

module.exports = mongoose.model('Answer', AnswerSchema);
