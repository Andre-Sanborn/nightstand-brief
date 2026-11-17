import { parseTime, nextAlarm, isDue, formatClock } from './core/alarm.js';
import { rowsOf, section, text, number } from './core/brief.js';
import { buildScript } from './core/speech.js';
import { applyVote, voteFor } from './core/votes.js';
import { startEngine, engineState, chime, startRing, stopRing } from './audio.js';
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
let pendingAlarmAt = null;
let ringing = false;
let wakeLock = null;
let lastMinute = -1;

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

function drawAlarmStatus() {
  const armed = alarmAt !== null;
  $('alarm-status').textContent = armed ? `Alarm ${clockLabel(new Date(alarmAt))}` : 'Alarm off';
  $('arm').hidden = armed;
  $('test').hidden = armed;
  $('disarm').hidden = !armed;
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

async function beginArming(at) {
  pendingAlarmAt = at;
  const state = await startEngine((event) => log(event, event !== 'audio running'));
  if (state !== 'running') log(`audio ${state} at arm`, true);
  chime();
  holdWakeLock();
  $('no-sound-help').hidden = true;
  $('confirm').hidden = false;
}

function finishArming() {
  alarmAt = pendingAlarmAt;
  pendingAlarmAt = null;
  store.set('alarmAt', alarmAt);
  log(`armed for ${clockLabel(new Date(alarmAt))}`);
  $('confirm').hidden = true;
  $('controls').hidden = true;
  drawAlarmStatus();
}

function disarm(reason) {
  alarmAt = null;
  store.set('alarmAt', null);
  log(reason);
  drawAlarmStatus();
}

async function ring() {
  ringing = true;
  $('ring-time').textContent = clockLabel(new Date());
  $('ring').hidden = false;
  show('clock');
  const state = await startRing();
  log(state === 'running' ? 'alarm tone started' : `alarm tone not playing, audio ${state}`, state !== 'running');
}

function readBrief() {
  $('read').hidden = true;
  $('hush').hidden = false;
  speak(buildScript(rows, new Date()), {
    onLine: (i, line) => { $('now-reading').textContent = line; },
    onEvent: (event) => log(event, true),
    onDone: () => {
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
  if (now.getMinutes() !== lastMinute) {
    lastMinute = now.getMinutes();
    drawClock(now);
  }
  if (alarmAt !== null && !ringing && $('rearm').hidden && isDue(now.getTime(), alarmAt)) ring();
}

async function loadBrief() {
  try {
    const response = await fetch('sample-brief.json', { cache: 'no-store' });
    rows = rowsOf(await response.json());
  } catch {
    rows = [];
    log('brief failed to load', true);
  }
  drawWeather();
  drawBrief();
}

$('face').addEventListener('click', () => { $('controls').hidden = !$('controls').hidden; });
$('alarm-time').value = store.get('time', '06:30');
$('alarm-time').addEventListener('change', () => store.set('time', $('alarm-time').value));
$('arm').addEventListener('click', () => {
  const time = parseTime($('alarm-time').value);
  if (time) beginArming(nextAlarm(new Date(), time).getTime());
});
$('test').addEventListener('click', () => beginArming(Date.now() + 60_000));
$('disarm').addEventListener('click', () => disarm('alarm turned off'));
$('heard').addEventListener('click', finishArming);
$('replay').addEventListener('click', () => chime());
$('not-heard').addEventListener('click', () => {
  log('chime not heard at arm', true);
  $('no-sound-help').hidden = false;
});
$('ring').addEventListener('click', stopAlarmAndGreet);
$('rearm').addEventListener('click', () => {
  $('rearm').hidden = true;
  beginArming(alarmAt);
});
$('dim').addEventListener('click', () => {
  const level = (store.get('dim', 2) % 3) + 1;
  store.set('dim', level);
  document.body.className = `dim-${level}`;
});
$('open-brief').addEventListener('click', () => { drawBrief(); show('brief'); });
$('open-log').addEventListener('click', () => { drawLog(); show('log'); });
$('back').addEventListener('click', () => { stopSpeaking(); $('read').hidden = false; $('hush').hidden = true; $('now-reading').textContent = ''; show('clock'); });
$('log-back').addEventListener('click', () => show('clock'));
$('log-clear').addEventListener('click', () => { store.set('log', []); drawLog(); });
$('read').addEventListener('click', readBrief);
$('hush').addEventListener('click', () => {
  stopSpeaking();
  $('read').hidden = false;
  $('hush').hidden = true;
  $('now-reading').textContent = '';
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
    disarm(`page reloaded after the alarm time ${clockLabel(new Date(alarmAt))}; alarm missed`);
    store.set('log', store.get('log', []).map((e, i, all) => (i === all.length - 1 ? { ...e, bad: true } : e)));
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
