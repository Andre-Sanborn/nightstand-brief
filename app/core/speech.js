import { section, text, number } from './brief.js';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

const MAX_TODOS = 4;
const MAX_NEWS = 3;

// Rewrites symbols a speech voice reads badly or skips.
export function forEar(value) {
  return text(value)
    .replace(/(\d|[AP]M)\s*[–—-]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/(\d)\s*%/g, '$1 percent')
    .replace(/(\d)\s*°/g, '$1 degrees')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentence(value) {
  const s = forEar(value);
  if (!s) return '';
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function greeting(meta, now) {
  const custom = sentence(meta.greeting);
  if (custom) return custom;
  return `Good morning. It's ${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}.`;
}

function todoLines(rows) {
  if (!rows.length) return ['Nothing needs you this morning.'];
  const shown = rows.slice(0, MAX_TODOS);
  const count = rows.length === 1 ? 'You have 1 to-do.' : `You have ${rows.length} to-dos.`;
  return [count, ...shown.map((r) => {
    const tag = forEar(r.tag);
    return sentence(tag ? `${tag}: ${text(r.title)}` : r.title);
  })];
}

function calendarLines(rows) {
  const today = rows.filter((r) => /^today\b/i.test(text(r.day)) && !/^nothing scheduled$/i.test(text(r.title)));
  if (!today.length) return ['Nothing on the calendar today.'];
  return ['On the calendar today.', ...today.map((r) => {
    const time = forEar(r.time);
    return sentence(/\w/.test(time) ? `${time}, ${text(r.title)}` : r.title);
  })];
}

function weatherLine(rows) {
  const today = rows[0];
  if (!today) return [];
  const parts = [forEar(today.title)];
  const hi = number(today.hi);
  const lo = number(today.lo);
  const pop = number(today.pop);
  if (hi !== null) parts.push(`high ${Math.round(hi)}`);
  if (lo !== null) parts.push(`low ${Math.round(lo)}`);
  if (pop !== null && pop > 0) parts.push(`${Math.round(pop)} percent chance of rain`);
  return [`Today's weather: ${parts.filter(Boolean).join(', ')}.`];
}

function newsLines(rows) {
  if (!rows.length) return [];
  const shown = rows.slice(0, MAX_NEWS);
  const lead = shown.length === 1 ? 'One thing in the news.' : `${shown.length} things in the news.`;
  return [lead, ...shown.map((r) => [sentence(r.title), sentence(r.detail)].filter(Boolean).join(' '))];
}

// One entry per utterance: short utterances survive where iPadOS cuts long ones off.
export function buildScript(rows, now) {
  const meta = section(rows, 'meta')[0] || {};
  return [
    greeting(meta, now),
    sentence(meta.title),
    ...todoLines(section(rows, 'todo')),
    ...calendarLines(section(rows, 'cal')),
    ...weatherLine(section(rows, 'wx')),
    ...newsLines(section(rows, 'news')),
    "That's the brief. The details are on screen.",
  ].filter(Boolean);
}
