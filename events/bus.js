'use strict';
/**
 * EVENT-DRIVEN PROGRAMMING (server side).
 * One shared Node.js EventEmitter. Route handlers *emit* facts ("a game ended") and
 * never need to know who reacts to them. Listeners (events/listeners.js) subscribe.
 * This is the publish/subscribe pattern: it keeps game rules decoupled from the
 * live-feed / leaderboard broadcasting code.
 */
const { EventEmitter } = require('events');

const EVENTS = Object.freeze({
  GAME_STARTED: 'game:started',
  ROUND_RESOLVED: 'round:resolved',
  LEVEL_UP: 'game:levelUp',
  ACHIEVEMENT: 'achievement:unlocked',
  GAME_OVER: 'game:over'
});

const bus = new EventEmitter();
bus.setMaxListeners(20);

module.exports = { bus, EVENTS };
