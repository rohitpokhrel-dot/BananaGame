'use strict';
/**
 * Subscribers to the server-side event bus. Each handler reacts to ONE kind of event and
 * pushes a human-readable message to every connected browser through SSE.
 */
const { bus, EVENTS } = require('./bus');
const sse = require('../services/sse');

function registerListeners() {
  bus.on(EVENTS.GAME_STARTED, ({ username, avatar }) => {
    sse.broadcast('feed', { kind: 'start', text: `${avatar} ${username} started a run` });
  });

  bus.on(EVENTS.LEVEL_UP, ({ username, avatar, level }) => {
    if (level >= 3) sse.broadcast('feed', { kind: 'level', text: `${avatar} ${username} reached level ${level}` });
  });

  bus.on(EVENTS.ACHIEVEMENT, ({ username, avatar, achievement }) => {
    sse.broadcast('feed', { kind: 'badge', text: `${avatar} ${username} unlocked ${achievement.icon} ${achievement.name}` });
  });

  bus.on(EVENTS.GAME_OVER, ({ username, avatar, score, newHighScore }) => {
    if (score <= 0) return;
    const suffix = newHighScore ? ' (new personal best!)' : '';
    sse.broadcast('feed', { kind: 'over', text: `${avatar} ${username} finished with ${score.toLocaleString('en-GB')} points${suffix}` });
    sse.broadcast('leaderboard'); // tell clients the table is stale so they re-fetch it
  });

  bus.on(EVENTS.ROUND_RESOLVED, ({ username, outcome, points }) => {
    if (process.env.DEBUG_EVENTS) console.log(`[event] ${username} ${outcome} ${points}`);
  });
}

module.exports = { registerListeners };
