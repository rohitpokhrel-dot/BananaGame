'use strict';
/**
 * Game API. The server is the referee: it fetches the puzzle, keeps the answer secret,
 * judges the reply with its own clock, and computes the score.
 *
 *   POST /api/game/start    begin a run, returns first puzzle
 *   POST /api/game/answer   submit a digit (or null on timeout)
 *   POST /api/game/skip     spend a skip token for a fresh puzzle
 *   POST /api/game/next     (re)issue a puzzle if the previous fetch failed
 *   POST /api/game/quit     end the run early
 */
const express = require('express');
const config = require('../config');
const Game = require('../models/Game');
const Round = require('../models/Round');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { fetchPuzzle } = require('../services/bananaClient');
const engine = require('../services/gameEngine');
const { bus, EVENTS } = require('../events/bus');
const { HttpError, wrap } = require('../utils/http');

const router = express.Router();
router.use(requireAuth);

// ---- helpers -------------------------------------------------------------------------

const publicGame = (g) => ({
  id: String(g._id),
  score: g.score,
  lives: g.lives,
  skipsLeft: g.skipsLeft,
  level: g.level,
  streak: g.streak,
  multiplier: engine.multiplierFor(g.streak),
  bestStreak: g.bestStreak,
  correct: g.correct
});

// Note: the solution is deliberately NOT included here.
const publicRound = (r) => ({
  id: String(r._id),
  imageUrl: r.imageUrl,
  level: r.level,
  timeLimitMs: r.timeLimitMs
});

async function issueRound(game) {
  const puzzle = await fetchPuzzle();                      // <-- interoperability with Banana API
  const round = await Round.create({
    game: game._id,
    imageUrl: puzzle.imageUrl,
    solution: puzzle.solution,
    level: game.level,
    timeLimitMs: engine.timeLimitFor(game.level)
  });
  game.currentRound = round._id;
  await game.save();
  return publicRound(round);
}

async function findActiveGame(req) {
  const game = await Game.findOne({ _id: req.body.gameId, user: req.user._id, status: 'active' });
  if (!game) throw new HttpError(404, 'No active game found. Start a new run.');
  return game;
}

/** Atomically mark a round resolved. Returns null if it was already resolved (double submit). */
const resolveRound = (roundId, gameId) =>
  Round.findOneAndUpdate(
    { _id: roundId, game: gameId, resolved: false },
    { resolved: true, answeredAt: new Date() },
    { new: true }
  );

async function finishGame(game, user) {
  game.status = 'over';
  game.endedAt = new Date();
  game.currentRound = null;
  await game.save();
  const newHighScore = game.score > user.bestScore;
  await User.updateOne({ _id: user._id }, { $inc: { gamesPlayed: 1 }, $max: { bestScore: game.score } });
  const summary = {
    score: game.score,
    level: game.level,
    correct: game.correct,
    bestStreak: game.bestStreak,
    newHighScore,
    bestScore: Math.max(user.bestScore, game.score)
  };
  bus.emit(EVENTS.GAME_OVER, { username: user.username, avatar: user.avatar, ...summary });
  return summary;
}

async function awardAchievements(user, game) {
  const earned = [];
  if (user.totalCorrect === 0) earned.push('first_peel');
  if (game.streak >= 5) earned.push('on_fire');
  if (game.streak >= 10) earned.push('banana_boss');
  if (game.score >= 1000) earned.push('thousandaire');
  if (game.level >= 5) earned.push('top_of_tree');
  const fresh = earned.filter((id) => !user.achievements.includes(id));

  const update = { $inc: { totalCorrect: 1 }, $max: { longestStreak: game.bestStreak } };
  if (fresh.length) update.$addToSet = { achievements: { $each: fresh } };
  await User.updateOne({ _id: user._id }, update);

  user.achievements.push(...fresh);
  user.totalCorrect += 1;
  return fresh.map((id) => ({ id, ...config.achievements[id] }));
}

// ---- routes --------------------------------------------------------------------------

router.post('/start', wrap(async (req, res) => {
  const old = await Game.findOne({ user: req.user._id, status: 'active' });
  if (old) await finishGame(old, req.user); // only one live run per player

  const game = await Game.create({ user: req.user._id, lives: config.game.lives, skipsLeft: config.game.skips });
  let round;
  try {
    round = await issueRound(game);
  } catch (err) {
    await game.deleteOne();
    throw err;
  }
  bus.emit(EVENTS.GAME_STARTED, { username: req.user.username, avatar: req.user.avatar });
  res.json({ game: publicGame(game), round });
}));

router.post('/answer', wrap(async (req, res) => {
  let { answer } = req.body;
  if (answer !== null && answer !== undefined) {
    answer = Number(answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 9) throw new HttpError(400, 'Answer must be a digit from 0 to 9');
  }
  const game = await findActiveGame(req);
  const round = await resolveRound(req.body.roundId, game._id);
  if (!round) throw new HttpError(409, 'That puzzle has already been answered');

  const { outcome, remainingMs } = engine.evaluate({
    answer,
    solution: round.solution,
    issuedAt: round.issuedAt.getTime(),
    now: Date.now(),
    limitMs: round.timeLimitMs
  });

  let points = 0;
  let achievements = [];
  if (outcome === 'correct') {
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.correct += 1;
    points = engine.scoreFor({ level: round.level, streak: game.streak, remainingMs, limitMs: round.timeLimitMs });
    game.score += points;
    game.level = engine.levelFor(game.correct);
    achievements = await awardAchievements(req.user, game);
  } else {
    game.lives -= 1;
    game.streak = 0;
    game.wrong += 1;
  }
  const leveledUp = game.level > round.level;

  bus.emit(EVENTS.ROUND_RESOLVED, { username: req.user.username, outcome, points });
  if (leveledUp) bus.emit(EVENTS.LEVEL_UP, { username: req.user.username, avatar: req.user.avatar, level: game.level });
  for (const a of achievements) {
    bus.emit(EVENTS.ACHIEVEMENT, { username: req.user.username, avatar: req.user.avatar, achievement: a });
  }

  const body = { outcome, solution: round.solution, points, leveledUp, achievements, next: null, needsNext: false, gameOver: false, summary: null };

  if (game.lives <= 0) {
    body.gameOver = true;
    body.summary = await finishGame(game, req.user);
  } else {
    await game.save();
    try {
      body.next = await issueRound(game);
    } catch {
      body.needsNext = true; // Banana API hiccup: the client will call /next to retry
    }
  }
  body.game = publicGame(game);
  res.json(body);
}));

router.post('/skip', wrap(async (req, res) => {
  const game = await findActiveGame(req);
  if (game.skipsLeft <= 0) throw new HttpError(400, 'No skips left');
  const round = await resolveRound(req.body.roundId, game._id);
  if (!round) throw new HttpError(409, 'That puzzle has already been answered');

  game.skipsLeft -= 1;
  game.streak = 0; // skipping costs your streak, but not a life
  await game.save();

  const body = { solution: round.solution, next: null, needsNext: false };
  try {
    body.next = await issueRound(game);
  } catch {
    body.needsNext = true;
  }
  body.game = publicGame(game);
  res.json(body);
}));

router.post('/next', wrap(async (req, res) => {
  const game = await findActiveGame(req);
  const current = game.currentRound ? await Round.findById(game.currentRound) : null;
  const round = current && !current.resolved ? publicRound(current) : await issueRound(game);
  res.json({ game: publicGame(game), round });
}));

router.post('/quit', wrap(async (req, res) => {
  const game = await findActiveGame(req);
  const summary = await finishGame(game, req.user);
  res.json({ summary, game: publicGame(game) });
}));

module.exports = router;
