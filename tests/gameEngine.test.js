'use strict';
// Run with:  npm test      (uses Node's built-in test runner, no extra packages)
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../services/gameEngine');

test('level rises every 5 correct answers', () => {
  assert.equal(e.levelFor(0), 1);
  assert.equal(e.levelFor(4), 1);
  assert.equal(e.levelFor(5), 2);
  assert.equal(e.levelFor(12), 3);
});

test('time limit shrinks with level but has a floor', () => {
  assert.equal(e.timeLimitFor(1), 20000);
  assert.equal(e.timeLimitFor(2), 18000);
  assert.equal(e.timeLimitFor(50), 7000);
});

test('streak multiplier grows by 0.25 and is capped', () => {
  assert.equal(e.multiplierFor(0), 1);
  assert.equal(e.multiplierFor(1), 1);
  assert.equal(e.multiplierFor(5), 2);
  assert.equal(e.multiplierFor(10), 3.25);
  assert.equal(e.multiplierFor(99), 3.25);
});

test('faster answers score more', () => {
  const fast = e.scoreFor({ level: 1, streak: 1, remainingMs: 18000, limitMs: 20000 });
  const slow = e.scoreFor({ level: 1, streak: 1, remainingMs: 2000, limitMs: 20000 });
  assert.ok(fast > slow);
  assert.equal(e.scoreFor({ level: 1, streak: 1, remainingMs: 20000, limitMs: 20000 }), 200);
});

test('evaluate: correct, wrong, timeout and late answers', () => {
  const base = { solution: 7, issuedAt: 0, limitMs: 10000 };
  assert.equal(e.evaluate({ ...base, answer: 7, now: 3000 }).outcome, 'correct');
  assert.equal(e.evaluate({ ...base, answer: 7, now: 3000 }).remainingMs, 7000);
  assert.equal(e.evaluate({ ...base, answer: 2, now: 3000 }).outcome, 'wrong');
  assert.equal(e.evaluate({ ...base, answer: null, now: 3000 }).outcome, 'timeout');
  assert.equal(e.evaluate({ ...base, answer: 7, now: 10500 }).outcome, 'correct'); // inside grace window
  assert.equal(e.evaluate({ ...base, answer: 7, now: 20000 }).outcome, 'timeout'); // far too late
});
