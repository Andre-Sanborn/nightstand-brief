import { CHIME_HZ, nextNote, chimeGapMs } from './core/softwake.js';

let ctx = null;
let ringTimer = null;
let ringStartedAt = 0;
let recovering = false;
let ringGeneration = 0;
let chimeTimer = null;
let chimeGeneration = 0;
let chimeVoice = null;
let lastChime = -1;
let ringVoices = [];
let recording = null;
let report = () => {};

const RAMP_SECONDS = 30;
const SETTLE_MS = 3000;
const CHIME_ATTACK = 0.15;
const CHIME_DECAY = 3.5;

export function engineState() {
  return ctx ? ctx.state : 'none';
}

// Must be called from a tap: iPadOS only starts audio inside a user gesture.
export async function startEngine(onEvent) {
  report = onEvent || report;
  // Without this, WebKit treats Web Audio as ambient sound and Silent mode mutes it.
  if (navigator.audioSession) {
    try { navigator.audioSession.type = 'playback'; } catch { report('audio session type not accepted'); }
  }
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
    ctx.addEventListener('statechange', () => {
      report(`audio ${ctx.state}`);
      if (ctx.state !== 'running') recover();
    });
    // A context left idle is a candidate for suspension, so one inaudible tone keeps it in use.
    const hum = ctx.createOscillator();
    const quiet = ctx.createGain();
    hum.frequency.value = 30;
    quiet.gain.value = 0.001;
    hum.connect(quiet).connect(ctx.destination);
    hum.start();
  }
  await recover();
  return ctx.state;
}

// A resume() or suspend() that never settles would otherwise block every later recovery.
async function settle(step) {
  let timer = null;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), SETTLE_MS); });
  try {
    if (await Promise.race([ctx[step](), timeout]) === 'timeout') report(`audio ${step} did not settle in 3 seconds`);
  } catch { /* the state check after each step decides what happens next */ } finally {
    clearTimeout(timer);
  }
}

// An interrupted context can refuse resume() until it has been suspended first.
async function recover() {
  if (!ctx || recovering || ctx.state === 'running') return;
  recovering = true;
  try {
    await settle('resume');
    if (ctx.state !== 'running') {
      await settle('suspend');
      await settle('resume');
    }
  } finally {
    recovering = false;
  }
}

function note(freq, at, length, level, attack = 0.02, type = 'triangle') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
  return { osc, gain, at };
}

export function chime() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.05;
  note(660, t, 0.5, 0.35);
  note(880, t + 0.25, 0.7, 0.35);
}

// Returns 'stopped' when stopRing() ran during the wait, so a stop tap is never overridden.
export async function startRing() {
  if (!ctx) return 'none';
  stopRing();
  stopRecording();
  const mine = ringGeneration;
  await recover();
  if (mine !== ringGeneration) return 'stopped';
  ringStartedAt = ctx.currentTime;
  const bar = () => {
    if (ctx.state !== 'running') { recover(); return; }
    const level = Math.min(1, 0.06 + ((ctx.currentTime - ringStartedAt) / RAMP_SECONDS) * 0.94);
    const t = ctx.currentTime + 0.03;
    ringVoices = ringVoices.filter((v) => v.end > ctx.currentTime);
    for (const [freq, at, length] of [[880, t, 0.22], [880, t + 0.28, 0.22], [1175, t + 0.56, 0.3]]) {
      ringVoices.push({ ...note(freq, at, length, level), end: at + length + 0.05 });
    }
  };
  bar();
  ringTimer = setInterval(bar, 1400);
  return ctx.state;
}

// Silences notes already scheduled, so the last bar does not sound under the greeting.
export function stopRing() {
  stopChimes();
  ringGeneration += 1;
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  for (const voice of ringVoices) fade(voice);
  ringVoices = [];
}

// One note per timer step, never a batch ahead, so a stop leaves nothing queued to sound later.
// levelNow() gives the gain for the note about to play.
export function startChimes(levelNow) {
  if (!ctx) return 'none';
  stopChimes();
  const mine = chimeGeneration;
  const step = () => {
    if (mine !== chimeGeneration) return;
    if (ctx.state === 'running') {
      lastChime = nextNote(lastChime, Math.random());
      chimeVoice = note(CHIME_HZ[lastChime], ctx.currentTime + 0.05, CHIME_DECAY, levelNow(), CHIME_ATTACK, 'sine');
    } else {
      recover();
    }
    chimeTimer = setTimeout(step, chimeGapMs(Math.random()));
  };
  step();
  return ctx.state;
}

// Fades the note still decaying, so the tail does not sound under the greeting.
export function stopChimes() {
  chimeGeneration += 1;
  if (chimeTimer) clearTimeout(chimeTimer);
  chimeTimer = null;
  if (chimeVoice) fade(chimeVoice);
  chimeVoice = null;
}

// A note that has not started is held at zero: cancelling its envelope leaves the default gain of 1.
function fade({ osc, gain, at }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(at > t ? 0 : gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.1);
  try { osc.stop(t + 0.12); } catch { /* already stopped */ }
}

// Needs a context, but not a running one, so it can run in the background after any tap.
export async function decodeRecording(bytes) {
  if (!ctx) throw new Error('no audio engine');
  return ctx.decodeAudioData(bytes);
}

// Must be called from a tap when the context may be suspended: resume() needs the gesture.
// Returns false with no engine. onEnded runs only when the buffer plays to its end.
export function playRecording(buffer, onEnded) {
  if (!ctx) return false;
  stopRecording();
  if (ctx.state !== 'running') recover();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    if (recording !== source) return;
    recording = null;
    onEnded();
  };
  recording = source;
  source.start();
  return true;
}

export function stopRecording() {
  if (!recording) return;
  const source = recording;
  recording = null;
  source.onended = null;
  try { source.stop(); } catch { /* never started */ }
}
