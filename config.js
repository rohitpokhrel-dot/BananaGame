'use strict';
/**
 * Central configuration. Game balance lives here so it can be tuned in one place
 * (and so the video can point at a single file when explaining the rules).
 *
 * AI-ASSISTANCE NOTE: This project was scaffolded with the help of an LLM (Claude, Anthropic).
 * Replace this note with your own reference text/date as your unit requires.
 */
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/banana-rush',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  cookieName: 'bn_token',
  sessionDays: 7,

  // Third-party web service we interoperate with (INTEROPERABILITY theme).
  banana: {
    url: 'https://marcconrad.com/uob/banana/api.php',
    timeoutMs: 6000
  },

  game: {
    lives: 3,
    skips: 2,
    correctPerLevel: 5,   // a level-up every 5 correct answers
    baseTimeMs: 20000,    // time limit at level 1
    stepMs: 2000,         // each level removes 2 seconds...
    minTimeMs: 7000,      // ...down to this floor
    graceMs: 3000,        // network allowance when the server checks the clock
    maxStreakForBonus: 10
  },

  achievements: {
    first_peel:   { icon: '🍌', name: 'First Peel',    desc: 'Solve your very first puzzle' },
    on_fire:      { icon: '🔥', name: 'On Fire',       desc: 'Reach a streak of 5' },
    banana_boss:  { icon: '👑', name: 'Banana Boss',   desc: 'Reach a streak of 10' },
    thousandaire: { icon: '💰', name: 'Thousandaire',  desc: 'Score 1,000 points in one run' },
    top_of_tree:  { icon: '🌴', name: 'Top of the Tree', desc: 'Reach level 5' }
  },

  avatars: ['🐵', '🦍', '🦧', '🐒', '🦜', '🐘', '🐯', '🦥']
};
