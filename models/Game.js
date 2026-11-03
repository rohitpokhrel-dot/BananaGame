'use strict';
/** One run of the game (3 lives). Scoring is computed on the server and stored here. */
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'over'], default: 'active' },
  score: { type: Number, default: 0 },
  lives: { type: Number, required: true },
  skipsLeft: { type: Number, required: true },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  currentRound: { type: mongoose.Schema.Types.ObjectId, ref: 'Round', default: null },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Game', gameSchema);
