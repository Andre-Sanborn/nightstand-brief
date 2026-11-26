let run = 0;
// Module-level so stopping one reading clears its timer before the next reading starts.
let watchdog = null;
const AFTER_CANCEL_MS = 250;

function clearWatchdog() {
  clearTimeout(watchdog);
  watchdog = null;
}

export function canSpeak() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// The list fills in after page load on iPadOS, so wait for voiceschanged when it is empty.
export function loadVoices(timeoutMs = 3000) {
  if (!canSpeak()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const read = () => synth.getVoices().map((v) => ({ name: v.name, lang: v.lang, localService: v.localService }));
  const now = read();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', done);
      resolve(read());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener('voiceschanged', done);
  });
}

function findVoice(name) {
  if (!name) return null;
  return window.speechSynthesis.getVoices().find((v) => v.name === name) || null;
}

export function stopSpeaking() {
  run += 1;
  clearWatchdog();
  if (canSpeak()) window.speechSynthesis.cancel();
}

// The first utterance is queued synchronously, so call this from inside a tap handler.
// A voice name not on this device falls back to the default voice.
export function speak(lines, { voice = null, onLine = () => {}, onDone = () => {}, onEvent = () => {} } = {}) {
  run += 1;
  clearWatchdog();
  if (!canSpeak()) { onEvent('speech not available'); onDone(); return; }
  const synth = window.speechSynthesis;
  // iPadOS drops an utterance queued in the same turn as cancel(), so cancel only
  // when something is queued, and then start after a pause.
  const busy = synth.speaking || synth.pending;
  if (busy) synth.cancel();
  const mine = run;
  const chosen = findVoice(voice);
  let index = 0;

  const next = () => {
    if (mine !== run) return;
    if (index >= lines.length) { onDone(); return; }
    const line = lines[index];
    const at = index;
    index += 1;
    let finished = false;
    // A cancelled line can still fire onend or onerror; it must not touch the next reading.
    const advance = (why) => {
      if (finished || mine !== run) return;
      finished = true;
      clearWatchdog();
      if (why) onEvent(`speech line ${at + 1}: ${why}`);
      next();
    };
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 0.95;
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    }
    utterance.onend = () => advance('');
    utterance.onerror = (e) => advance(`error ${e.error || ''}`.trim());
    onLine(at, line);
    // Some iPadOS versions never fire onend; move on rather than stall the brief.
    // Set before speak(), in case onend fires synchronously and the next line starts first.
    watchdog = setTimeout(() => {
      if (finished || mine !== run) return;
      finished = true;
      clearWatchdog();
      onEvent(`speech line ${at + 1}: no end event`);
      synth.cancel();
      setTimeout(next, AFTER_CANCEL_MS);
    }, 6000 + line.length * 110);
    synth.speak(utterance);
  };
  if (busy) setTimeout(next, AFTER_CANCEL_MS); else next();
}
