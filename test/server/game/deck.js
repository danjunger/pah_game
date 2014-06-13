'use strict';

var should = require('should'),
    Deck = require('../../../lib/models/deck');
var assert = require('assert');

describe('Deck class', function() {
  beforeEach(function(){
    var testCards = ['card1','card2','card3','card4','card5','card6','card7','card8','card9','card10'];
    var testDeck = new Deck(testCards);
    this.testDeck = testDeck;
    this.testCards = testCards;
  });

  it('should create a new deck object', function() {
    var testDeck = this.testDeck;

    assert.equal(testDeck.undrawn.length, this.testCards.length);
    assert.equal(testDeck.discarded.length, 0);
    assert.equal(testDeck.playercards.length, 0);
  });

  it('should shuffle the input cards', function() {
    // use map to copy the array
    var currentCards = this.testDeck.undrawn.map(function(card) { return card; });

    // test for equality first
    assert.deepEqual(this.testDeck.undrawn, currentCards);

    // shuffle and check for inequality
    this.testDeck.shuffle();
    assert.notDeepEqual(this.testDeck.undrawn, currentCards);
  });

  it('should handle drawing a card', function() {
    // use map to copy the array
    var currentCards = this.testDeck.undrawn.map(function(card) { return card; });

    // test for equality first
    assert.deepEqual(this.testDeck.undrawn, currentCards);

    // draw a card and compare the drawn card to the untainted array
    var card = this.testDeck.draw();
    assert.deepEqual(card, currentCards[currentCards.length - 1]);
    
    // verify the drawn card is also in the player array
    assert.deepEqual(this.testDeck.playercards[0], currentCards[currentCards.length - 1]);
  });

  it('should handle drawing a card without adding to player array', function() {
    // use map to copy the array
    var currentCards = this.testDeck.undrawn.map(function(card) { return card; });
    var numCards = this.testDeck.undrawn.length;

    // test for equality first
    assert.deepEqual(this.testDeck.undrawn, currentCards);

    // draw a card and compare the drawn card to the untainted array
    var card = this.testDeck.next();
    assert.deepEqual(card, currentCards[currentCards.length - 1]);
    
    // verify the counts of the arrays
    assert.equal(this.testDeck.playercards.length, 0);
    assert.equal(this.testDeck.undrawn.length, numCards - 1);
  });

  it('should test when drawing is allowed', function() {
    // verify a full deck can be drawn
    assert.equal(this.testDeck.canDraw(), true);

    // draw all of the cards
    var myCards = [];
    var numCards = this.testDeck.undrawn.length;

    // draw all of the cards
    for (var i = 0; i < numCards; i++) {
      myCards.push(this.testDeck.draw());
    }

    // verify that the deck may not be drawn when all of the cards are held
    assert.equal(this.testDeck.canDraw(), false);

    // discard one for the next test
    this.testDeck.discard(myCards.pop());

    // verify that the deck may be drawn when there are no cards
    // in the undrawn pile but there are some in the discard pile
    assert.equal(this.testDeck.canDraw(), true);
  });

  it('should handle discarding a card', function() {
    // use map to copy the array
    var currentCards = this.testDeck.undrawn.map(function(card) { return card; });
    var card = this.testDeck.draw();

    // verify the drawn card is also in the player array
    assert.deepEqual(this.testDeck.playercards[0], currentCards[currentCards.length - 1]);
    assert.equal(this.testDeck.playercards.length, 1);

    // discard the card
    this.testDeck.discard(card);

    // verify the discarded card is in the discard array
    assert.deepEqual(this.testDeck.discarded[0], currentCards[currentCards.length - 1]);

    // verify the discarded card is not in the player array
    assert.equal(this.testDeck.playercards.length, 0);
  });

  it('should handle shuffleDiscard', function() {
    var numCards = this.testDeck.undrawn.length;

    var card1 = this.testDeck.draw();
    var card2 = this.testDeck.draw();

    this.testDeck.discard(card1);
    this.testDeck.discard(card2);

    // verify the undrawn array has 3 cards
    assert.equal(this.testDeck.undrawn.length, numCards - 2);

    // verify the discard array has 2 cards
    assert.equal(this.testDeck.discarded.length, 2);

    this.testDeck.shuffleDiscard();

    // verify the undrawn array has testDeck.length cards
    assert.equal(this.testDeck.undrawn.length, numCards);

    // verify the discard array has 0 cards
    assert.equal(this.testDeck.discarded.length, 0);
  });

  it('should handle drawing, discarding, and reshuffling', function() {
    var myCards = [];
    var numCards = this.testDeck.undrawn.length;

    // draw all of the cards
    for (var i = 0; i < numCards; i++) {
      myCards.push(this.testDeck.draw());
    }

    // verify the undrawn array is empty
    assert.equal(this.testDeck.undrawn.length, 0);

    // verify the player array contains all of the cards
    assert.equal(this.testDeck.playercards.length, numCards);

    // discard all of the cards
    for (i = 0; i < numCards; i++) {
      this.testDeck.discard(myCards.pop());
    }

    // verify the player array is empty
    assert.equal(this.testDeck.playercards.length, 0);

    // verify the discard array contains all of the cards
    assert.equal(this.testDeck.discarded.length, numCards);

    // verify that drawing a card works
    var card = this.testDeck.draw();

    assert.notDeepEqual(card, undefined);    
  });

});