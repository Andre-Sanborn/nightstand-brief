import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowsOf } from '../app/core/brief.js';
import { buildScript, forEar } from '../app/core/speech.js';

const sample = rowsOf(JSON.parse(readFileSync(new URL('../app/sample-brief.json', import.meta.url), 'utf8')));
const morning = new Date('2026-03-03T06:30:00-07:00');

test('forEar rewrites symbols a voice reads badly', () => {
  assert.equal(forEar('5:30 – 7 PM'), '5:30 to 7 PM');
  assert.equal(forEar('Today · Tue Mar 3'), 'Today, Tue Mar 3');
  assert.equal(forEar('80% rain, 45°'), '80 percent rain, 45 degrees');
  assert.equal(forEar('Claude & AI'), 'Claude and AI');
  assert.equal(forEar('quiet morning — then rain'), 'quiet morning, then rain');
});

test('the sample brief is read in the planned order', () => {
  assert.deepEqual(buildScript(sample, morning), [
    "Good morning. It's Tuesday, March 3.",
    'A quiet morning, then the dentist at two, and the library books are due.',
    'You have 2 to-dos.',
    'Today: Return the library books.',
    'Friday: Send Jordan the trip packing list.',
    'On the calendar today.',
    '2 to 2:45 PM, Dentist cleaning.',
    '6:30 PM, Dinner with Sam and Priya.',
    "Today's weather: Partly sunny, high 52, low 34, 10 percent chance of rain.",
    '3 things in the news.',
    'A sample chip maker opens a new plant. This is an invented story that stands in for the first news item.',
    'A sample central bank holds rates steady. This is an invented story that stands in for the second news item.',
    'Volunteers finish a sample cave survey. This is an invented story that stands in for the third news item.',
    "That's the brief. The details are on screen.",
  ]);
});

test('an empty brief still greets and closes', () => {
  assert.deepEqual(buildScript([], morning), [
    "Good morning. It's Tuesday, March 3.",
    'Nothing needs you this morning.',
    'Nothing on the calendar today.',
    "That's the brief. The details are on screen.",
  ]);
});

test('a written greeting replaces the composed one, and a placeholder calendar row is not read', () => {
  const rows = [
    { section: 'meta', ord: 0, greeting: 'Morning, sleepyhead', title: '' },
    { section: 'cal', ord: 0, day: 'Today · Tue', time: '—', title: 'Nothing scheduled' },
    { section: 'todo', ord: 0, title: 'Water the plants' },
    { section: 'wx', ord: 0, title: 'Clear', hi: '61.4', pop: '0' },
    { section: 'news', ord: 0, id: 'a', title: 'Only story' },
  ];
  assert.deepEqual(buildScript(rows, morning), [
    'Morning, sleepyhead.',
    'You have 1 to-do.',
    'Water the plants.',
    'Nothing on the calendar today.',
    "Today's weather: Clear, high 61.",
    'One thing in the news.',
    'Only story.',
    "That's the brief. The details are on screen.",
  ]);
});

test('no more than four to-dos and three news items are read', () => {
  const rows = [];
  for (let i = 0; i < 6; i += 1) rows.push({ section: 'todo', ord: i, title: `Task ${i}` });
  for (let i = 0; i < 5; i += 1) rows.push({ section: 'news', ord: i, id: `n${i}`, title: `Story ${i}` });
  const script = buildScript(rows, morning);
  assert.equal(script.filter((line) => line.startsWith('Task')).length, 4);
  assert.equal(script.filter((line) => line.startsWith('Story')).length, 3);
  assert.ok(script.includes('You have 6 to-dos.'));
  assert.ok(script.includes('3 things in the news.'));
});

test('a brief from another day is not read as today\'s', () => {
  const rows = [
    { section: 'meta', ord: 0, date: '2026-03-02', title: 'Yesterday\'s headline' },
    { section: 'todo', ord: 0, title: 'Yesterday\'s task' },
  ];
  assert.deepEqual(buildScript(rows, morning), [
    "Good morning. It's Tuesday, March 3.",
    "Today's brief has not arrived, so there is nothing new to read.",
  ]);
});
