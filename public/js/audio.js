/**
 * Arcade sound effects synthesised with the Web Audio API (no audio files needed).
 *
 * VIRTUAL IDENTITY / COOKIES: the sound on/off choice is stored in a normal, JavaScript-readable
 * cookie called bn_prefs. Contrast this with the login cookie (bn_token), which is httpOnly.
 * A preference is harmless if read; a session token is not, so they get different protection.
 */
let ctx = null;

export function readPrefs() {
  const m = document.cookie.match(/(?:^|; )bn_prefs=([^;]*)/);
  try { return m ? JSON.parse(decodeURIComponent(m[1])) : {}; } catch { return {}; }
}

function writePrefs(patch) {
  const value = encodeURIComponent(JSON.stringify({ ...readPrefs(), ...patch }));
  document.cookie = `bn_prefs=${value}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
}

let enabled = readPrefs().sound !== false;

export const isEnabled = () => enabled;
export function setEnabled(value) { enabled = value; writePrefs({ sound: value }); }

/** Browsers only allow audio after a user gesture, so call this from a click. */
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, dur, type = 'square', vol = 0.07) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  key()      { tone(660, 0, 0.05, 'square', 0.04); },
  tick()     { tone(880, 0, 0.06, 'triangle', 0.06); },
  correct()  { tone(523, 0, 0.09); tone(659, 0.09, 0.09); tone(784, 0.18, 0.18); },
  wrong()    { tone(196, 0, 0.18, 'sawtooth'); tone(139, 0.16, 0.32, 'sawtooth'); },
  levelUp()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.12, 'triangle', 0.08)); },
  badge()    { tone(988, 0, 0.1, 'triangle'); tone(1319, 0.1, 0.25, 'triangle'); },
  over()     { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.22, 'sawtooth', 0.06)); }
};
