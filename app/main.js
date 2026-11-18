import { parseTime, nextAlarm, isDue, minutesLate, refreshEvery, formatClock } from './core/alarm.js';
import { rowsOf, section, text, number } from './core/brief.js';
import { buildScript } from './core/speech.js';
import { applyVote, voteFor } from './core/votes.js';
import { parseSource, briefRequest, isStale } from './core/source.js';
import { softWakeMinutes, softStart, wakePhase, softProgress, dawnRgb, dawnColour, inkFor, chimeGain } from './core/softwake.js';
import { startEngine, engineState, chime, startRing, stopRing, startChimes, stopChimes } from './audio.js';
import { speak, stopSpeaking } from './speak.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, content) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (content !== undefined) node.textContent = content;
  return node;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const LOG_LIMIT = 300;
const IM_UP_LABEL = "I'm up: alarm off";
const VOTE_LABELS = [['up', 'More like this'], ['down', 'Less like this'], ['never', 'Nothing like this']];

// Storage can throw in private windows; the clock must still run without it.
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`ns.${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`ns.${key}`, JSON.stringify(value)); } catch { /* not kept */ }
  },
};

let rows = [];
let alarmAt = store.get('alarmAt', null);
// Kept with the alarm so a reloaded page runs the soft wake it was armed with.
let armedAt = store.get('armedAt', null);
let softMs = store.get('softMs', 0) || 0;
let softBegun = false;
let softTapAt = store.get('softTapAt', null);
let reading = false;
let ringing = false;
// When the chime check closes itself if nobody answers it.
let confirmUntil = null;
let wakeLock = null;
let lastMinute = -1;

const CONFIRM_MS = 2 * 60_000;
const MINUTE = 60_000;
const TEST_SOFT_MS = 30_000;

function log(event, bad = false) {
  const entries = store.get('log', []);
  entries.push({ at: new Date().toISOString(), event, bad });
  store.set('log', entries.slice(-LOG_LIMIT));
}

function clockLabel(date) {
  const c = formatClock(date);
  return `${c.time} ${c.suffix}`;
}

function show(id) {
  for (const view of ['clock', 'brief', 'log']) $(view).hidden = view !== id;
}

function drawClock(now) {
  const c = formatClock(now);
  $('time').textContent = c.time;
  $('suffix').textContent = c.suffix;
  $('date').textContent = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  // A few pixels of drift each minute, so the digits do not burn into the panel.
  const m = now.getMinutes();
  $('face').style.transform = `translate(${(((m * 7) % 5) - 2) * 8}px, ${(((m * 3) % 5) - 2) * 8}px)`;
}

function drawWeather() {
  const today = section(rows, 'wx')[0];
  if (!today) { $('weather').textContent = ''; return; }
  const hi = number(today.hi);
  const lo = number(today.lo);
  const temps = [hi, lo].filter((n) => n !== null).map((n) => `${Math.round(n)}°`).join(' / ');
  $('weather').textContent = [temps, text(today.title)].filter(Boolean).join('  ·  ');
}

function softStartAt() {
  return softStart(alarmAt, armedAt, softMs);
}

function drawAlarmStatus() {
  const armed = alarmAt !== null;
  let status = 'Alarm off';
  if (armed) {
    const start = softStartAt();
    status = `Alarm ${clockLabel(new Date(alarmAt))}`;
    if (start < alarmAt) status += ` · soft wake ${clockLabel(new Date(start))}`;
  }
  $('alarm-status').textContent = status;
  $('arm').hidden = armed;
  $('test').hidden = armed;
  $('disarm').hidden = !armed;
  $('im-up').hidden = !armed;
}

async function holdWakeLock() {
  if (!('wakeLock' in navigator)) { log('wake lock not supported', true); return; }
  if (wakeLock || document.visibilityState !== 'visible') return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    wakeLock = lock;
    log('wake lock held');
    lock.addEventListener('release', () => {
      wakeLock = null;
      log('wake lock released', alarmAt !== null);
      if (alarmAt !== null) holdWakeLock();
    });
  } catch (err) {
    log(`wake lock refused: ${err.name}`, true);
  }
}

function startAudio() {
  return startEngine((event) => log(event, event !== 'audio running'));
}

function closeConfirm() {
  $('confirm').hidden = true;
  confirmUntil = null;
}

// The alarm is stored at the tap, so falling asleep on the chime check still leaves it set.
// The chime check only reports whether the owner heard the speaker.
async function arm(at, length = softWakeMinutes(store.get('soft', null)) * MINUTE, armed = Date.now()) {
  if (isDue(Date.now(), at)) return;
  endSoftWake();
  softBegun = false;
  softTapAt = null;
  store.set('softTapAt', null);
  alarmAt = at;
  armedAt = armed;
  softMs = length;
  store.set('alarmAt', at);
  store.set('armedAt', armed);
  store.set('softMs', length);
  log(`armed for ${clockLabel(new Date(at))}${length ? `, soft wake from ${clockLabel(new Date(softStartAt()))}` : ''}`);
  $('controls').hidden = true;
  drawAlarmStatus();
  $('no-sound-help').hidden = true;
  $('confirm').hidden = false;
  confirmUntil = Date.now() + CONFIRM_MS;
  holdWakeLock();
  const state = await startAudio();
  if (state !== 'running') log(`audio ${state} at arm`, true);
  chime();
}

function disarm(reason, bad = false) {
  endSoftWake();
  softBegun = false;
  softTapAt = null;
  store.set('softTapAt', null);
  alarmAt = null;
  armedAt = null;
  softMs = 0;
  store.set('alarmAt', null);
  store.set('armedAt', null);
  store.set('softMs', 0);
  log(reason, bad);
  drawAlarmStatus();
}

function drawLight(ms) {
  const progress = softProgress(ms, softStartAt(), alarmAt);
  $('light').style.backgroundColor = dawnColour(progress);
  $('light').style.color = inkFor(dawnRgb(progress));
}

function startSoftWake(ms) {
  softBegun = true;
  closeConfirm();
  $('rearm').hidden = true;
  drawLight(ms);
  $('light').hidden = false;
  const state = engineState();
  $('light-text').textContent = state === 'none'
    ? 'Tap to hear your brief. The page restarted, so the alarm is silent until you tap.'
    : 'Tap to hear your brief';
  if (state === 'none') {
    log('soft wake started with no audio engine', true);
  } else {
    log(`soft wake started, audio ${state}`, state !== 'running');
    startChimes(() => (alarmAt === null ? 0 : chimeGain(softProgress(Date.now(), softStartAt(), alarmAt))));
  }
  // Not awaited, like the ring's fetch.
  loadBrief();
}

function endSoftWake() {
  stopChimes();
  $('light').hidden = true;
}

// Speech has to start inside this tap, so nothing here may wait on a promise first.
// The alarm stays armed and still rings at the alarm time.
function greetFromSoftWake() {
  endSoftWake();
  softTapAt = Date.now();
  store.set('softTapAt', softTapAt);
  log('soft wake tapped');
  drawBrief();
  show('brief');
  $('brief').scrollTop = 0;
  readBrief();
  // A reloaded page has no audio engine; this tap is the only chance to start one before the ring.
  if (engineState() === 'none') startAudio();
}

function alarmReached(ms) {
  // The alarm never infers that the owner is up: a sleepy tap on the light must not cancel it.
  if (softTapAt !== null) {
    log('alarm rings after a soft-wake tap');
    quietReading();
  } else if (softBegun) {
    log('alarm rings: soft wake was not tapped');
  }
  ring(minutesLate(ms, alarmAt));
}

async function ring(late) {
  ringing = true;
  endSoftWake();
  closeConfirm();
  $('rearm').hidden = true;
  $('ring-time').textContent = clockLabel(new Date());
  $('ring').hidden = false;
  show('clock');
  if (late > 0) log(`alarm rang ${late} minutes late`, true);
  // Not awaited: the tone must not wait on the network, and the stop tap reads whatever has arrived.
  loadBrief();
  if (engineState() === 'none') { log('alarm time reached with no audio engine', true); return; }
  const state = await startRing();
  if (state === 'stopped') return;
  log(state === 'running' ? 'alarm tone started' : `alarm tone not playing, audio ${state}`, state !== 'running');
}

function quietReading() {
  stopSpeaking();
  reading = false;
  $('read').hidden = false;
  $('hush').hidden = true;
  $('now-reading').textContent = '';
}

function readBrief() {
  $('read').hidden = true;
  $('hush').hidden = false;
  reading = true;
  speak(buildScript(rows, new Date()), {
    onLine: (i, line) => { $('now-reading').textContent = line; },
    onEvent: (event) => log(event, true),
    onDone: () => {
      reading = false;
      $('now-reading').textContent = '';
      $('read').hidden = false;
      $('hush').hidden = true;
      log('brief read to the end');
    },
  });
}

// Speech has to start inside this tap, so nothing here may wait on a promise first.
function stopAlarmAndGreet() {
  stopRing();
  ringing = false;
  $('ring').hidden = true;
  closeConfirm();
  disarm('alarm stopped by tap');
  drawBrief();
  show('brief');
  $('brief').scrollTop = 0;
  readBrief();
}

function item(row, withVotes) {
  const box = el('div', 'item');
  const title = el('p', 'item-title');
  if (text(row.tag)) title.appendChild(el('span', 'tag', text(row.tag)));
  title.appendChild(document.createTextNode(text(row.title)));
  box.appendChild(title);
  if (text(row.detail)) box.appendChild(el('p', 'item-detail', text(row.detail)));
  if (text(row.source)) box.appendChild(el('p', 'item-detail', text(row.source)));
  if (withVotes && text(row.id)) {
    const votes = el('div', 'votes');
    const current = voteFor(store.get('votes', []), row.id);
    for (const [vote, label] of VOTE_LABELS) {
      const button = el('button', null, label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(current === vote));
      button.addEventListener('click', () => {
        store.set('votes', applyVote(store.get('votes', []), row, vote, new Date().toISOString()));
        drawBrief();
      });
      votes.appendChild(button);
    }
    box.appendChild(votes);
  }
  return box;
}

function box(heading, children) {
  const wrap = el('section', 'box');
  wrap.appendChild(el('h2', null, heading));
  for (const child of children) wrap.appendChild(child);
  return wrap;
}

function drawBrief() {
  const body = $('brief-body');
  const keep = $('brief').scrollTop;
  body.replaceChildren();
  const meta = section(rows, 'meta')[0] || {};
  const notice = isStale(meta, new Date()) ? "Today's brief has not arrived. This is the last one received." : briefNotice;
  $('brief-notice').textContent = notice;
  $('brief-notice').hidden = notice === '';
  if (text(meta.title)) body.appendChild(el('h1', 'headline', text(meta.title)));
  body.appendChild(el('p', 'meta', [text(meta.day), text(meta.time)].filter(Boolean).join('  ·  ')));

  const lists = [
    ['News', 'news', true], ['To do', 'todo', false],
  ];
  for (const [heading, name, votes] of lists) {
    const found = section(rows, name);
    if (found.length) body.appendChild(box(heading, found.map((r) => item(r, votes))));
  }

  const cal = section(rows, 'cal');
  if (cal.length) {
    const nodes = [];
    let day = null;
    for (const r of cal) {
      if (text(r.day) !== day) { day = text(r.day); nodes.push(el('p', 'cal-day', day)); }
      const line = el('div', 'cal-row');
      line.appendChild(el('span', 'when', text(r.time)));
      line.appendChild(el('span', null, [text(r.title), text(r.detail)].filter(Boolean).join(' · ')));
      nodes.push(line);
    }
    body.appendChild(box('Calendar', nodes));
  }

  const wx = section(rows, 'wx');
  if (wx.length) {
    const strip = el('div', 'wx');
    for (const r of wx) {
      const d = el('div', 'wx-day');
      const hi = number(r.hi);
      const lo = number(r.lo);
      d.appendChild(el('p', null, text(r.day)));
      d.appendChild(el('p', 'temps', [hi, lo].filter((n) => n !== null).map((n) => `${Math.round(n)}°`).join(' / ')));
      d.appendChild(el('p', null, text(r.title)));
      strip.appendChild(d);
    }
    const note = section(rows, 'wx_note')[0];
    body.appendChild(box('Weather', note && text(note.detail) ? [strip, el('p', 'item-detail', text(note.detail))] : [strip]));
  }

  for (const [heading, name] of [['Email', 'email'], ['AI notes', 'ai'], ['Tips', 'tip']]) {
    const found = section(rows, name);
    if (found.length) body.appendChild(box(heading, found.map((r) => item(r, false))));
  }
  $('brief').scrollTop = keep;
}

function drawLog() {
  const list = $('log-list');
  list.replaceChildren();
  const entries = store.get('log', []);
  if (!entries.length) list.appendChild(el('li', null, 'Nothing logged yet.'));
  for (const entry of entries) {
    const when = new Date(entry.at);
    const stamp = `${when.getMonth() + 1}/${when.getDate()} ${clockLabel(when)}:${String(when.getSeconds()).padStart(2, '0')}`;
    list.appendChild(el('li', entry.bad ? 'bad' : null, `${stamp}  ${entry.event}`));
  }
}

function tick() {
  const now = new Date();
  const ms = now.getTime();
  if (now.getMinutes() !== lastMinute) {
    lastMinute = now.getMinutes();
    drawClock(now);
  }
  if (confirmUntil !== null && ms >= confirmUntil) {
    closeConfirm();
    log('chime not confirmed', true);
  }
  if (alarmAt === null || ringing) return;
  const phase = wakePhase(ms, alarmAt, softStartAt());
  if (phase === 'missed') {
    disarm(`alarm missed: page resumed ${minutesLate(ms, alarmAt)} minutes late`, true);
    return;
  }
  if (phase === 'ring') { alarmReached(ms); return; }
  if (phase === 'soft') {
    if (!softBegun) startSoftWake(ms);
    else if (!$('light').hidden) drawLight(ms);
  }
  if (ms - lastLoad >= refreshEvery(ms, alarmAt)) loadBrief();
}

let briefNotice = '';
let lastLoad = 0;
// Only the newest request may replace the rows, so a slow older one cannot overwrite a fresh brief.
let loadSeq = 0;
// Logged only when the outcome changes, so a night of refreshes does not fill the log.
let loadFailed = null;

async function fetchRows() {
  const source = parseSource(store.get('source', null));
  if (!source) {
    briefNotice = 'Sample brief. Set a brief source to see your own.';
    const response = await fetch('sample-brief.json', { cache: 'no-store' });
    return rowsOf(await response.json());
  }
  const request = briefRequest(source);
  const response = await fetch(request.url, { headers: request.headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  briefNotice = '';
  return rowsOf(await response.json());
}

// A failed refresh keeps the rows already on screen; the stale check stops an old brief being read as new.
async function loadBrief() {
  lastLoad = Date.now();
  loadSeq += 1;
  const mine = loadSeq;
  try {
    const fetched = await fetchRows();
    if (mine !== loadSeq) return briefNotice;
    rows = fetched;
    if (loadFailed !== false) log('brief loaded');
    loadFailed = false;
  } catch (err) {
    if (mine !== loadSeq) return briefNotice;
    briefNotice = `The brief did not load: ${err.message}.`;
    if (loadFailed !== true) log(`brief failed to load: ${err.message}`, true);
    loadFailed = true;
  }
  drawWeather();
  drawBrief();
  return briefNotice;
}

$('face').addEventListener('click', () => { $('controls').hidden = !$('controls').hidden; });
$('alarm-time').value = store.get('time', '06:30');
$('alarm-time').addEventListener('change', () => store.set('time', $('alarm-time').value));
$('arm').addEventListener('click', () => {
  const time = parseTime($('alarm-time').value);
  if (time) arm(nextAlarm(new Date(), time).getTime());
});
$('soft-wake').value = String(softWakeMinutes(store.get('soft', null)));
$('soft-wake').addEventListener('change', () => store.set('soft', softWakeMinutes(Number($('soft-wake').value))));
// With soft wake on, the test compresses it to 30 seconds ahead of the one-minute alarm.
$('test').addEventListener('click', () => {
  arm(Date.now() + 60_000, softWakeMinutes(store.get('soft', null)) ? TEST_SOFT_MS : 0);
});
$('disarm').addEventListener('click', () => disarm('alarm turned off'));
$('heard').addEventListener('click', () => {
  closeConfirm();
  log('chime confirmed');
});
$('replay').addEventListener('click', () => chime());
$('not-heard').addEventListener('click', () => {
  log('chime not heard at arm', true);
  $('no-sound-help').hidden = false;
});
$('confirm-off').addEventListener('click', () => {
  closeConfirm();
  disarm('alarm turned off at the chime check');
});
$('ring').addEventListener('click', stopAlarmAndGreet);
$('light').addEventListener('click', greetFromSoftWake);
// A time already past is never stored again; the tick rings it, now with the engine this tap starts.
$('rearm').addEventListener('click', () => {
  $('rearm').hidden = true;
  if (alarmAt === null) return;
  if (isDue(Date.now(), alarmAt)) startAudio();
  else arm(alarmAt, softMs, armedAt);
});
$('dim').addEventListener('click', () => {
  const level = (store.get('dim', 2) % 3) + 1;
  store.set('dim', level);
  document.body.className = `dim-${level}`;
});
$('open-brief').addEventListener('click', () => { drawBrief(); show('brief'); });
$('open-source').addEventListener('click', () => {
  const saved = store.get('source', null) || {};
  $('source-repo').value = saved.repo || '';
  $('source-token').value = saved.token || '';
  $('source-status').textContent = parseSource(saved) ? `Reading from ${saved.repo}.` : 'Showing the sample brief.';
  $('source').hidden = false;
});
$('source').addEventListener('submit', async (event) => {
  event.preventDefault();
  const source = parseSource({ repo: $('source-repo').value, token: $('source-token').value });
  if (!source) { $('source-status').textContent = 'Enter the repository as owner/name and paste the token.'; return; }
  store.set('source', source);
  $('source-status').textContent = 'Loading…';
  const problem = await loadBrief();
  $('source-status').textContent = problem || `Loaded from ${source.repo}.`;
});
$('source-sample').addEventListener('click', async () => {
  store.set('source', null);
  await loadBrief();
  $('source-status').textContent = 'Showing the sample brief.';
});
$('source-close').addEventListener('click', () => { $('source').hidden = true; });
$('open-log').addEventListener('click', () => { drawLog(); show('log'); });
$('back').addEventListener('click', () => { quietReading(); show('clock'); });
$('log-back').addEventListener('click', () => show('clock'));
$('log-clear').addEventListener('click', () => { store.set('log', []); drawLog(); });
$('read').addEventListener('click', readBrief);
$('hush').addEventListener('click', quietReading);
// Two taps, because this sits beside "Stop reading" and a sleepy tap must not cancel the alarm.
let imUpUntil = 0;
$('im-up').addEventListener('click', () => {
  if (Date.now() <= imUpUntil) {
    imUpUntil = 0;
    $('im-up').textContent = IM_UP_LABEL;
    disarm('alarm turned off from the brief');
    return;
  }
  imUpUntil = Date.now() + 5000;
  $('im-up').textContent = 'Tap again to turn the alarm off';
  setTimeout(() => { if (imUpUntil && Date.now() > imUpUntil) { imUpUntil = 0; $('im-up').textContent = IM_UP_LABEL; } }, 5100);
});

document.addEventListener('visibilitychange', () => {
  if (alarmAt === null) return;
  log(`page ${document.visibilityState}`, document.visibilityState !== 'visible');
  if (document.visibilityState === 'visible') holdWakeLock();
});

document.body.className = `dim-${store.get('dim', 2)}`;

// A reloaded page has no audio engine, and only a tap can start one.
if (alarmAt !== null) {
  if (isDue(Date.now(), alarmAt)) {
    disarm(`page reloaded after the alarm time ${clockLabel(new Date(alarmAt))}; alarm missed`, true);
  } else {
    log('page reloaded while armed', true);
    $('rearm-detail').textContent = `The page restarted. The alarm for ${clockLabel(new Date(alarmAt))} needs a tap to work.`;
    $('rearm').hidden = false;
  }
}

drawAlarmStatus();
tick();
setInterval(tick, 1000);
loadBrief();
