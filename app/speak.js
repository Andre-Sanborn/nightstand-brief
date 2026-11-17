let run = 0;
// Module-level so stopping one reading clears its timer before the next reading starts.
let watchdog = null;

function clearWatchdog() {
  clearTimeout(watchdog);
  watchdog = null;
}

export function canSpeak() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function stopSpeaking() {
  run += 1;
  clearWatchdog();
  if (canSpeak()) window.speechSynthesis.cancel();
}

// The first utterance is queued synchronously, so call this from inside a tap handler.
export function speak(lines, { onLine = () => {}, onDone = () => {}, onEvent = () => {} } = {}) {
  stopSpeaking();
  if (!canSpeak()) { onEvent('speech not available'); onDone(); return; }
  const mine = run;
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
    utterance.onend = () => advance('');
    utterance.onerror = (e) => advance(`error ${e.error || ''}`.trim());
    onLine(at, line);
    // Some iPadOS versions never fire onend; move on rather than stall the brief.
    // Set before speak(), in case onend fires synchronously and the next line starts first.
    watchdog = setTimeout(() => {
      window.speechSynthesis.cancel();
      advance('no end event');
    }, 6000 + line.length * 110);
    window.speechSynthesis.speak(utterance);
  };
  next();
}
