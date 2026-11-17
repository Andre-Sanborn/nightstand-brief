let ctx = null;
let ringTimer = null;
let ringStartedAt = 0;
let recovering = false;
let ringGeneration = 0;
let report = () => {};

const RAMP_SECONDS = 30;
const SETTLE_MS = 3000;

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

function note(freq, at, length, level) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
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
  const mine = ringGeneration;
  await recover();
  if (mine !== ringGeneration) return 'stopped';
  ringStartedAt = ctx.currentTime;
  const bar = () => {
    if (ctx.state !== 'running') { recover(); return; }
    const level = Math.min(1, 0.06 + ((ctx.currentTime - ringStartedAt) / RAMP_SECONDS) * 0.94);
    const t = ctx.currentTime + 0.03;
    note(880, t, 0.22, level);
    note(880, t + 0.28, 0.22, level);
    note(1175, t + 0.56, 0.3, level);
  };
  bar();
  ringTimer = setInterval(bar, 1400);
  return ctx.state;
}

export function stopRing() {
  ringGeneration += 1;
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
}
