import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBrief } from '../app/core/validate.js';

const sampleJson = JSON.parse(readFileSync(new URL('../app/sample-brief.json', import.meta.url), 'utf8'));
const morning = new Date('2026-03-03T06:30:00-07:00');

// The sample with today's date added; each test changes one thing.
function brief(change = (rows) => rows) {
  const rows = structuredClone(sampleJson.rows);
  rows[0].date = '2026-03-03';
  return { rows: change(rows) };
}

const replace = (rows, section, ord, fields) =>
  rows.map((r) => (r.section === section && r.ord === ord ? { ...r, ...fields } : r));

test('the dated sample brief passes with nothing to report', () => {
  // Every titled row has a title, the news ids differ, wx numbers are numbers,
  // two cal rows are "Today", no title nears 140 characters, there are no links,
  // and the six spoken rows hold 124 words.
  assert.deepEqual(validateBrief(brief(), morning), { ok: true, errors: [], warnings: [] });
});

test('the undated sample brief fails on the missing date', () => {
  assert.deepEqual(validateBrief(sampleJson, morning).errors, ['meta ord 0: date is missing.']);
});

test('error: not an object with a rows array', () => {
  const expected = { ok: false, errors: ['The brief must be an object with a "rows" array.'], warnings: [] };
  assert.deepEqual(validateBrief(null, morning), expected);
  assert.deepEqual(validateBrief([], morning), expected);
  assert.deepEqual(validateBrief({ rows: {} }, morning), expected);
  assert.deepEqual(validateBrief('{"rows":[]}', morning), expected);
});

test('error: a row without a known section', () => {
  const result = validateBrief(brief((rows) => [...rows, { section: 'sports', ord: 0, title: 'A game' }, { ord: 5 }, null]), morning);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    'Row 23 (ord 0) has an unknown section "sports".',
    'Row 24 (ord 5) has an unknown section "".',
    'Row 25 is not an object.',
  ]);
});

test('error: no meta row', () => {
  const result = validateBrief(brief((rows) => rows.filter((r) => r.section !== 'meta')), morning);
  assert.deepEqual(result.errors, ['There is no meta row.']);
});

test('error: more than one meta row', () => {
  const result = validateBrief(brief((rows) => [...rows, { section: 'meta', ord: 1, date: '2026-03-03' }]), morning);
  assert.deepEqual(result.errors, ['There are 2 meta rows; there must be one.']);
});

test('error: meta.date not written as YYYY-MM-DD, or not a real date', () => {
  for (const [date, shown] of [['3/3/2026', '3/3/2026'], ['2026-3-3', '2026-3-3'], ['2026-03-03T06:00', '2026-03-03T06:00'],
    ['2026-02-30', '2026-02-30'], ['2026-13-01', '2026-13-01']]) {
    const result = validateBrief(brief((rows) => replace(rows, 'meta', 0, { date })), morning);
    assert.deepEqual(result.errors, [`meta ord 0: date "${shown}" is not a real date written as YYYY-MM-DD.`], date);
    assert.deepEqual(result.warnings, [], date);
  }
});

test('error: an empty title on a todo, cal, news, ai, email or tip row', () => {
  const result = validateBrief(brief((rows) => {
    let out = replace(rows, 'todo', 0, { title: '' });
    out = replace(out, 'cal', 2, { title: '   ' });
    out = replace(out, 'news', 1, { title: undefined });
    out = replace(out, 'ai', 0, { title: '' });
    out = replace(out, 'email', 0, { title: '' });
    out = replace(out, 'tip', 0, { title: '' });
    // A wx_note row has no title, and a wx row may go without one.
    return replace(out, 'wx', 3, { title: '' });
  }), morning);
  assert.deepEqual(result.errors, [
    'todo ord 0: title is empty.',
    'cal ord 2: title is empty.',
    'news ord 1: title is empty.',
    'ai ord 0: title is empty.',
    'email ord 0: title is empty.',
    'tip ord 0: title is empty.',
  ]);
});

test('error: a news row without an id', () => {
  const result = validateBrief(brief((rows) => replace(rows, 'news', 2, { id: '' })), morning);
  assert.deepEqual(result.errors, ['news ord 2: id is missing.']);
});

test('error: a news row with a duplicate id', () => {
  const result = validateBrief(brief((rows) => replace(rows, 'news', 2, { id: 'sample-chip-plant' })), morning);
  assert.deepEqual(result.errors, ['news ord 2: id "sample-chip-plant" is already used by news ord 0.']);
});

test('error: a wx hi, lo or pop that is present but not numeric', () => {
  const result = validateBrief(brief((rows) => {
    const out = replace(rows, 'wx', 0, { hi: '52°', lo: 'cold', pop: true });
    // Numeric strings pass, and an empty or missing field means "not given".
    return replace(out, 'wx', 1, { hi: '47', lo: '', pop: undefined });
  }), morning);
  assert.deepEqual(result.errors, [
    'wx ord 0: hi "52°" is not a number.',
    'wx ord 0: lo "cold" is not a number.',
    'wx ord 0: pop "true" is not a number.',
  ]);
});

test('error: more than three news rows', () => {
  const extra = { section: 'news', ord: 3, id: 'sample-fourth', topic: 'World & US', title: 'A fourth story', detail: 'Invented.' };
  const result = validateBrief(brief((rows) => [...rows, extra]), morning);
  assert.deepEqual(result.errors, ['There are 4 news rows; there must be at most 3.']);
});

test('warning: meta.date is not the local date of now', () => {
  const result = validateBrief(brief((rows) => replace(rows, 'meta', 0, { date: '2026-03-02' })), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ["meta ord 0: date 2026-03-02 is not today's local date, so the app will not read it aloud."]);
});

test('warning: the date check uses Boise local time, not UTC', () => {
  // 11:30 PM on March 2 in Boise (UTC-7) is already March 3 in UTC.
  const lateEvening = new Date('2026-03-02T23:30:00-07:00');
  const result = validateBrief(brief((rows) => replace(rows, 'meta', 0, { date: '2026-03-02' })), lateEvening);
  assert.deepEqual(result.warnings, []);
});

test('warning: no wx rows', () => {
  const result = validateBrief(brief((rows) => rows.filter((r) => r.section !== 'wx')), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ['There are no wx rows, so no weather is read.']);
});

test('warning: no cal row whose day starts with Today', () => {
  const result = validateBrief(brief((rows) => rows.filter((r) => !(r.section === 'cal' && r.ord < 2))), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ['No cal row has a day starting with "Today".']);
});

test('warning: a cal day of "Todayish" is not today', () => {
  const result = validateBrief(brief((rows) => [
    ...rows.filter((r) => r.section !== 'cal'),
    { section: 'cal', ord: 0, day: 'Todayish', time: '9 AM', title: 'Standup' },
  ]), morning);
  assert.deepEqual(result.warnings, ['No cal row has a day starting with "Today".']);
});

test('a "Nothing scheduled" row for today satisfies the calendar check', () => {
  const result = validateBrief(brief((rows) => [
    ...rows.filter((r) => r.section !== 'cal'),
    { section: 'cal', ord: 0, day: 'today · Tue Mar 3', time: '', title: 'Nothing scheduled' },
  ]), morning);
  assert.deepEqual(result.warnings, []);
});

test('warning: a news row with no topic or no detail', () => {
  const result = validateBrief(brief((rows) => {
    const out = replace(rows, 'news', 0, { topic: '' });
    return replace(out, 'news', 2, { detail: undefined });
  }), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ['news ord 0: topic is missing.', 'news ord 2: detail is missing.']);
});

test('warning: a title longer than 140 characters', () => {
  const result = validateBrief(brief((rows) => {
    const out = replace(rows, 'todo', 0, { title: 'a'.repeat(141) });
    return replace(out, 'todo', 1, { title: 'b'.repeat(140) });
  }), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, ['todo ord 0: title is 141 characters; keep it to 140.']);
});

test('warning: a link that does not start with https://', () => {
  const result = validateBrief(brief((rows) => {
    let out = replace(rows, 'news', 0, { link: 'http://example.com/story' });
    out = replace(out, 'email', 0, { link: 'mail.example.com/thread' });
    return replace(out, 'news', 1, { link: 'https://example.com/story' });
  }), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, [
    'news ord 0: link does not start with https://.',
    'email ord 0: link does not start with https://.',
  ]);
});

test('warning: more to-dos than are read aloud', () => {
  const extra = (rows) => [
    ...rows,
    { section: 'todo', ord: 2, title: 'Water the plants' },
    { section: 'todo', ord: 3, title: 'Pay the water bill' },
    { section: 'todo', ord: 4, title: 'Book the car service' },
  ];
  // The sample has two to-dos; three more makes five.
  assert.deepEqual(validateBrief(brief(extra), morning).warnings, [
    'There are 5 todo rows, and only the first four are read.',
  ]);
  const four = (rows) => extra(rows).slice(0, -1);
  assert.deepEqual(validateBrief(brief(four), morning).warnings, []);
});

test('error: a spoken row with empty or missing text', () => {
  const result = validateBrief(brief((rows) => {
    const out = replace(rows, 'spoken', 1, { text: '  ' });
    return replace(out, 'spoken', 3, { text: undefined });
  }), morning);
  assert.deepEqual(result.errors, ['spoken ord 1: text is empty.', 'spoken ord 3: text is empty.']);
});

test('warning: no spoken rows, and an older brief without them stays valid', () => {
  const result = validateBrief(brief((rows) => rows.filter((r) => r.section !== 'spoken')), morning);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, ['There are no spoken rows, so the app reads its own plainer script.']);
});

test('warning: a narration over 450 words in total', () => {
  const words = (n) => Array.from({ length: n }, () => 'word').join(' ');
  const narration = (a, b) => (rows) => [
    ...rows.filter((r) => r.section !== 'spoken'),
    { section: 'spoken', ord: 0, text: words(a) },
    { section: 'spoken', ord: 1, text: `  ${words(b)}\n` },
  ];
  // 300 + 151 = 451 words is one too many; 300 + 150 = 450 is the limit.
  assert.deepEqual(validateBrief(brief(narration(300, 151)), morning).warnings, [
    'The spoken rows hold 451 words; keep the narration to 450.',
  ]);
  assert.deepEqual(validateBrief(brief(narration(300, 150)), morning).warnings, []);
});

test('meta.audio: a plain .mp3 file name passes, and leaving it out passes', () => {
  const named = brief((rows) => replace(rows, 'meta', 0, { audio: 'brief-2026-03-03-3fa9c1d2.mp3' }));
  assert.deepEqual(validateBrief(named, morning), { ok: true, errors: [], warnings: [] });
});

test('error: meta.audio that is not a plain .mp3 file name', () => {
  const cases = [
    ['audio/brief.mp3', 'audio "audio/brief.mp3"'],
    ['brief.wav', 'audio "brief.wav"'],
    ['brief 1.mp3', 'audio "brief 1.mp3"'],
    ['.mp3', 'audio ".mp3"'],
    ['', 'audio ""'],
    [null, 'audio ""'],
    [7, 'audio "7"'],
  ];
  for (const [audio, quoted] of cases) {
    const result = validateBrief(brief((rows) => replace(rows, 'meta', 0, { audio })), morning);
    assert.deepEqual(result.errors, [`meta ord 0: ${quoted} is not a file name such as "brief-2026-03-03-1a2b3c4d.mp3".`], String(audio));
  }
});
