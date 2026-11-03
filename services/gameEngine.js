'use strict';
/**
 * Pure game rules: no database, no HTTP. Because these are plain functions they are
 * easy to unit test (see tests/gameEngine.test.js) and easy to explain.
 */
const { game: g } = require('../config');

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Level goes up every `correctPerLevel` correct answers. */
function levelFor(correctCount) {
  return 1 + Math.floor(correctCount / g.correctPerLevel);
}

/** Time allowed for a puzzle shrinks as the level rises, down to a floor. */
function timeLimitFor(level) {
  return Math.max(g.minTimeMs, g.baseTimeMs - (level - 1) * g.stepMs);
}

/** Streak multiplier: x1.00 for the first correct answer, +0.25 each, capped. */
function multiplierFor(streak) {
  if (streak <= 0) return 1;
  return 1 + 0.25 * (Math.min(streak, g.maxStreakForBonus) - 1);
}

/** Points for a correct answer: (level base + speed bonus) * streak multiplier. */
function scoreFor({ level, streak, remainingMs, limitMs }) {
  const ratio = clamp(remainingMs / limitMs, 0, 1);
  const base = 100 + (level - 1) * 10;
  const speedBonus = Math.round(100 * ratio);
  return Math.round((base + speedBonus) * multiplierFor(streak));
}

/**
 * Judge an answer using the SERVER clock.
 * The solution never leaves the server until the round is resolved, and the timer the
 * player sees is only cosmetic, so neither can be tampered with from the browser.
 * @returns {{outcome: 'correct'|'wrong'|'timeout', remainingMs: number}}
 */
function evaluate({ answer, solution, issuedAt, now, limitMs }) {
  const elapsed = now - issuedAt;
  if (answer === null || answer === undefined || elapsed > limitMs + g.graceMs) {
    return { outcome: 'timeout', remainingMs: 0 };
  }
  const remainingMs = Math.max(0, limitMs - elapsed);
  return { outcome: answer === solution ? 'correct' : 'wrong', remainingMs };
}

module.exports = { levelFor, timeLimitFor, multiplierFor, scoreFor, evaluate };
