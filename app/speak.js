let run = 0;

export function canSpeak() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function stopSpeaking() {
  run += 1;
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
    let watchdog = null;
    const advance = (why) => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      if (why) onEvent(`speech line ${at + 1}: ${why}`);
      next();
    };
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 0.95;
    utterance.onend = () => advance('');
    utterance.onerror = (e) => advance(`error ${e.error || ''}`.trim());
    onLine(at, line);
    window.speechSynthesis.speak(utterance);
    // Some iPadOS versions never fire onend; move on rather than stall the brief.
    watchdog = setTimeout(() => {
      window.speechSynthesis.cancel();
      advance('no end event');
    }, 6000 + line.length * 110);
  };
  next();
}
