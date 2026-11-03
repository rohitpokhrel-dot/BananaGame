# Banana Rush

An arcade puzzle game built on the [Banana API](https://marcconrad.com/uob/banana/doc.php).
Each round shows a banana puzzle with a hidden digit (0-9). Type it before the peel runs out.
3 lives, 2 skips, streak multipliers, levels that shorten the clock, badges and a live leaderboard.

**Stack:** Node.js + Express, MongoDB (Mongoose), vanilla JavaScript front end (ES modules), Server-Sent Events.

## Run it

1. Install Node.js 18+ and MongoDB (local) or create a free MongoDB Atlas cluster.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env      # then edit JWT_SECRET (and MONGODB_URI if using Atlas)
   npm start                 # http://localhost:3000
   npm test                  # unit tests for the scoring rules
   ```
3. Open two browser windows with two accounts to see the live feed and leaderboard update in real time.

## Folder map

```
server.js              entry point: Express, MongoDB connection, routes
config.js              game balance, cookie/JWT settings, badge catalogue
models/                User, Game, Round (Mongoose schemas)
routes/auth.js         register / login / logout / me
routes/game.js         start / answer / skip / next / quit  (the referee)
routes/live.js         leaderboard + SSE stream
middleware/            auth (JWT cookie), rateLimit
services/bananaClient.js   INTEROPERABILITY: calls the Banana API
services/gameEngine.js     pure scoring/level rules (unit tested)
services/sse.js            server-push hub
events/bus.js, listeners.js    server-side event bus (EventEmitter)
public/                index.html, css/style.css, js/ (api, events, game, audio, main)
tests/                 node:test unit tests
```

## The four themes, mapped to this code

Use this as a checklist for your video. The marking criteria reward *your own* understanding, so
read the files named here and be ready to explain **why** things are done this way.

### 1. Version control
- Repo layout is modular: models, routes, services, middleware and front-end modules are separate files,
  so changes are small and conflicts rare. `services/gameEngine.js` has no database or HTTP code, which is
  why it could be unit tested in isolation.
- Workflow to follow (see "Git workflow" below): feature branches, small commits, tags for releases,
  `.gitignore` keeps `node_modules` and `.env` (secrets) out of history, `package.json` + lockfile pin dependencies.
- For higher marks: compare alternatives (trunk-based vs feature branches, monorepo vs separate front/back repos),
  and talk about code review via pull requests and tagging `v1.0.0` for the submission.

### 2. Event-driven programming
- **Browser:** DOM events (`click`, `keydown`, `submit`), a custom pub/sub bus (`public/js/events.js`),
  timer events (`requestAnimationFrame` drives `timer:tick`, and a time-out is just another event).
  `game.js` only *announces* (`round:result`); `main.js` has independent listeners for HUD, sound, shake and toasts.
- **Server:** a Node `EventEmitter` (`events/bus.js`). Routes emit `game:over`, `achievement:unlocked`, etc.;
  `events/listeners.js` reacts by pushing messages out through Server-Sent Events (`services/sse.js`).
- Justify: decoupling (adding a feature = adding a listener), non-blocking I/O, and why SSE rather than
  polling or WebSockets (one-way push is all we need; WebSockets add complexity).

### 3. Interoperability
- `services/bananaClient.js` calls the third-party Banana web service over HTTPS (REST-style GET, JSON reply:
  `{question: <image url>, solution: <digit>}`). The only things shared with that system are the protocol and data format.
- The *browser never calls the Banana API*. Our server does, stores the solution in MongoDB and only reveals it
  after the round is resolved. Reasons: stops cheating, avoids CORS problems, lets us validate untrusted data,
  and lets us time-out (6 s) and report a clean 502 if the service is down.
- Also interoperating: browser <-> our server (JSON REST + SSE), our server <-> MongoDB (driver protocol).
- For higher marks: discuss alternatives (calling the API directly from the browser, using `base64=yes`, the CSV output,
  caching puzzles in the database) and the risks (service may be discontinued, rate limits, "not for commercial use").

### 4. Virtual identity
- Accounts: `routes/auth.js`, `models/User.js`. Passwords are hashed with **bcrypt** (salted, 12 rounds); the plain
  password is never stored. Login failures use the same message for "no such user" and "wrong password" and do a dummy
  hash compare so timing doesn't leak which usernames exist. Login/register are rate-limited.
- Session: a signed **JWT in an httpOnly, SameSite=Lax cookie** (`middleware/auth.js`). JavaScript can't read it
  (limits XSS damage); SameSite blocks cross-site requests (basic CSRF protection); `secure` is on in production.
- A second, *non-sensitive* cookie `bn_prefs` (sound on/off) is readable from JavaScript (`public/js/audio.js`).
  Contrast the two in the video: different data, different protection.
- Identity drives gameplay: every Game belongs to a user, scores/badges/streaks persist, and the leaderboard shows
  avatars + usernames.
- For higher marks: compare with server-side sessions (session id in cookie + store), OAuth/social login, passkeys,
  2FA, and explain trade-offs (JWT can't be revoked easily before expiry; sessions need a shared store).

## Git workflow (suggested)

```bash
git init
git add .gitignore package.json README.md
git commit -m "chore: project skeleton"
git checkout -b feature/banana-client
git add services/bananaClient.js config.js
git commit -m "feat: fetch puzzles from Banana API with timeout and validation"
git checkout main && git merge --no-ff feature/banana-client
# repeat per feature: feature/auth, feature/game-engine, feature/live-feed, feature/ui
git tag -a v1.0.0 -m "Submission version"
git remote add origin <your GitHub URL> && git push -u origin main --tags
```

Make small, meaningful commits as you go and keep the log: screenshots of `git log --oneline --graph`
and your GitHub history are good evidence for the "supporting evidence of your work on the code" requirement.

## Referencing and AI use (required by the brief)

- Puzzle service: Banana API by Marc Conrad, https://marcconrad.com/uob/banana/doc.php (not for commercial use).
- Libraries: express, mongoose, bcryptjs, jsonwebtoken, cookie-parser, dotenv (all MIT/ISC licensed). Fonts: Bungee and Figtree via Google Fonts.
- **This code was generated with the help of a large language model (Claude, Anthropic).** The brief allows this for
  code but requires it to be acknowledged. Add your own reference line in the file headers (server.js, config.js)
  and mark which parts you changed or wrote yourself. The video itself must be your own voice and your own words.

## Video outline (max 10 minutes, unedited, your own voice)

| Time | What to cover |
|------|---------------|
| 0:00-1:00 | Live demo: register, play a few rounds, show lives/streak/level, game over, leaderboard |
| 1:00-3:00 | Version control: your repo, branches, commits, tags, modular structure |
| 3:00-5:00 | Event-driven: show `events.js`, a listener in `main.js`, server `bus.js`/SSE; show two windows updating live |
| 5:00-7:30 | Interoperability: `bananaClient.js`, the JSON, why the server proxies it, failure handling |
| 7:30-9:30 | Virtual identity: bcrypt, JWT cookie (show it in browser dev tools, httpOnly ticked), `bn_prefs` cookie |
| 9:30-10:00 | Compare the four themes and what you'd improve |

Also: present your working code to your tutor in **Week 8 or earlier**, and keep evidence of it.

## Known limitations / ideas

- A page refresh during a run abandons it (the next "Start run" banks the old score).
- In-memory rate limiter is per-process; use Redis if you run several servers.
- Add HTTPS + `NODE_ENV=production` when deploying so the cookie is `secure`.
- Ideas: daily challenge, power-ups, WebSocket duels, difficulty modes, caching puzzles in MongoDB.
