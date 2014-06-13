'use strict';

var should = require('should'),
    PAHGameObj = require('../../../lib/models/pah_gameobj');
var assert = require('assert');

describe('PAH_GameObj class', function() {
  beforeEach(function(){
    var testGameObj = new PAHGameObj();
    this.testGameObj = testGameObj;
  });

  it('should create a new PAH Game object', function() {
    var testGameObj = this.testGameObj;

    assert.equal(testGameObj.hand.length, 0);
    assert.equal(testGameObj.victoryCards.length, 0);
  });

  it('should be able to add a card', function() {
    var testGameObj = this.testGameObj;
    assert.equal(testGameObj.hand.length, 0);

    testGameObj.addCard({name:'test',value:'tester'});

    assert.equal(testGameObj.hand.length, 1);
  });

  it('should be able to add a victory card', function() {
    var testGameObj = this.testGameObj;
    assert.equal(testGameObj.victoryCards.length, 0);

    testGameObj.addVictoryCard({name:'test',value:'tester'});

    assert.equal(testGameObj.victoryCards.length, 1);
  });

  it('should be able to remove a card', function() {
    var testGameObj = this.testGameObj;
    assert.equal(testGameObj.hand.length, 0);

    var card = {name:'test',value:'tester'};
    testGameObj.addCard(card);

    assert.equal(testGameObj.hand.length, 1);

    testGameObj.removeCard({name:'test',value:'tester'});
    assert.equal(testGameObj.hand.length, 0);
  });

  it('removing a card should not delete the whole hand', function() {
    var testGameObj = this.testGameObj;
    assert.equal(testGameObj.hand.length, 0);

    var card = {name:'test',value:'tester'};
    var card2 = {name:'test2',value:'tester2'};
    testGameObj.addCard(card);
    testGameObj.addCard(card2);

    assert.equal(testGameObj.hand.length, 2);

    testGameObj.removeCard({name:'test',value:'tester'});
    assert.equal(testGameObj.hand.length, 1);
  });

  it('be able to delete the whole hand', function() {
    var testGameObj = this.testGameObj;
    assert.equal(testGameObj.hand.length, 0);

    var card = {name:'test',value:'tester'};
    var card2 = {name:'test2',value:'tester2'};
    var card3 = {name:'test3',value:'tester3'};
    testGameObj.addCard(card);
    testGameObj.addCard(card2);
    testGameObj.addVictoryCard(card3);

    assert.equal(testGameObj.hand.length, 2);
    assert.equal(testGameObj.victoryCards.length, 1);

    testGameObj.reset();
    assert.equal(testGameObj.hand.length, 0);
    assert.equal(testGameObj.victoryCards.length, 0);
  });

});