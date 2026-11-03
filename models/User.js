'use strict';
/**
 * VIRTUAL IDENTITY: the persistent account. Note that only a bcrypt HASH of the password is
 * stored, never the password itself.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: '🐵' },
  bestScore: { type: Number, default: 0, index: -1 },
  gamesPlayed: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

/** What the browser is allowed to know about a user (never the hash). */
userSchema.statics.toPublic = function toPublic(u) {
  return {
    id: String(u._id),
    username: u.username,
    avatar: u.avatar,
    bestScore: u.bestScore,
    gamesPlayed: u.gamesPlayed,
    totalCorrect: u.totalCorrect,
    longestStreak: u.longestStreak,
    achievements: u.achievements
  };
};

module.exports = mongoose.model('User', userSchema);
