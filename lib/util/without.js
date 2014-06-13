'use strict';

var _ = require('underscore');

var difference = function(array){
   var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));

   var containsEquals = function(obj, target) {
    if (obj === null) return false;
    return _.any(obj, function(value) {
      return _.isEqual(value, target);
    });
  };

  return _.filter(array, function(value){ return ! containsEquals(rest, value); });
};

var without = function(array) {
  return difference(array, Array.prototype.slice.call(arguments, 1));
};

module.exports = without;