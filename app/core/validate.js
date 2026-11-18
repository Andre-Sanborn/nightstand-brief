import { text } from './brief.js';
import { isStale } from './source.js';

export const SECTIONS = ['meta', 'todo', 'cal', 'wx', 'wx_note', 'news', 'ai', 'email', 'tip'];

const TITLED = ['todo', 'cal', 'news', 'ai', 'email', 'tip'];
const MAX_NEWS = 3;
const MAX_TITLE = 140;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function label(row) {
  const ord = row.ord === undefined || row.ord === null ? '(no ord)' : row.ord;
  return `${row.section} ord ${ord}`;
}

// The month and day must exist, or the brief would be stale on every date.
function isCalendarDate(value) {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Stricter than the app's number(), which would quietly read "52°" as 52.
function isNumeric(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || value.trim() === '') return false;
  return Number.isFinite(Number(value));
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

export function validateBrief(json, now) {
  const errors = [];
  const warnings = [];
  if (!json || typeof json !== 'object' || Array.isArray(json) || !Array.isArray(json.rows)) {
    return { ok: false, errors: ['The brief must be an object with a "rows" array.'], warnings };
  }

  const rows = [];
  json.rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`Row ${index} is not an object.`);
    } else if (!SECTIONS.includes(row.section)) {
      const ord = row.ord === undefined || row.ord === null ? '(no ord)' : row.ord;
      errors.push(`Row ${index} (ord ${ord}) has an unknown section "${text(row.section)}".`);
    } else {
      rows.push(row);
    }
  });

  const metas = rows.filter((r) => r.section === 'meta');
  if (metas.length === 0) errors.push('There is no meta row.');
  if (metas.length > 1) errors.push(`There are ${metas.length} meta rows; there must be one.`);
  const meta = metas[0];
  if (meta) {
    const date = text(meta.date);
    if (!date) {
      errors.push(`${label(meta)}: date is missing.`);
    } else if (!isCalendarDate(date)) {
      errors.push(`${label(meta)}: date "${date}" is not a real date written as YYYY-MM-DD.`);
    } else if (isStale(meta, now)) {
      warnings.push(`${label(meta)}: date ${date} is not today's local date, so the app will not read it aloud.`);
    }
  }

  const newsIds = new Map();
  for (const row of rows) {
    const name = label(row);
    if (TITLED.includes(row.section) && !text(row.title)) errors.push(`${name}: title is empty.`);
    if (text(row.title).length > MAX_TITLE) {
      warnings.push(`${name}: title is ${text(row.title).length} characters; keep it to ${MAX_TITLE}.`);
    }
    if (isPresent(row.link) && !text(row.link).startsWith('https://')) {
      warnings.push(`${name}: link does not start with https://.`);
    }
    if (row.section === 'wx') {
      for (const field of ['hi', 'lo', 'pop']) {
        if (isPresent(row[field]) && !isNumeric(row[field])) {
          errors.push(`${name}: ${field} "${text(row[field])}" is not a number.`);
        }
      }
    }
    if (row.section === 'news') {
      const id = text(row.id);
      if (!id) {
        errors.push(`${name}: id is missing.`);
      } else if (newsIds.has(id)) {
        errors.push(`${name}: id "${id}" is already used by ${newsIds.get(id)}.`);
      } else {
        newsIds.set(id, name);
      }
      if (!text(row.topic)) warnings.push(`${name}: topic is missing.`);
      if (!text(row.detail)) warnings.push(`${name}: detail is missing.`);
    }
  }

  const newsCount = rows.filter((r) => r.section === 'news').length;
  if (newsCount > MAX_NEWS) errors.push(`There are ${newsCount} news rows; there must be at most ${MAX_NEWS}.`);
  const todos = rows.filter((r) => r.section === 'todo').length;
  if (todos > 4) warnings.push(`There are ${todos} todo rows, and only the first four are read.`);
  if (!rows.some((r) => r.section === 'wx')) warnings.push('There are no wx rows, so no weather is read.');
  if (!rows.some((r) => r.section === 'cal' && /^today\b/i.test(text(r.day)))) {
    warnings.push('No cal row has a day starting with "Today".');
  }

  return { ok: errors.length === 0, errors, warnings };
}
