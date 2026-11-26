import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowsOf } from '../app/core/brief.js';
import { buildScript, forEar, sentences } from '../app/core/speech.js';

const sample = rowsOf(JSON.parse(readFileSync(new URL('../app/sample-brief.json', import.meta.url), 'utf8')));
const withoutSpoken = sample.filter((r) => r.section !== 'spoken');
const morning = new Date('2026-03-03T06:30:00-07:00');

test('forEar rewrites symbols a voice reads badly', () => {
  assert.equal(forEar('5:30 – 7 PM'), '5:30 to 7 PM');
  assert.equal(forEar('Today · Tue Mar 3'), 'Today, Tue Mar 3');
  assert.equal(forEar('80% rain, 45°'), '80 percent rain, 45 degrees');
  assert.equal(forEar('Claude & AI'), 'Claude and AI');
  assert.equal(forEar('quiet morning — then rain'), 'quiet morning, then rain');
});

test('forEar reads a dash between times or numbers as "to", and leaves bare hyphens alone', () => {
  assert.equal(forEar('2 – 2:45 PM'), '2 to 2:45 PM');
  assert.equal(forEar('8–8:30 AM'), '8 to 8:30 AM');
  assert.equal(forEar('8 AM – 9 AM'), '8 AM to 9 AM');
  assert.equal(forEar('11 AM—1 PM'), '11 AM to 1 PM');
  assert.equal(forEar('2 - 3 PM'), '2 to 3 PM');
  assert.equal(forEar('Call 208-555-0142'), 'Call 208-555-0142');
  assert.equal(forEar('Due 2026-11-18'), 'Due 2026-11-18');
  assert.equal(forEar('Boeing 737-800'), 'Boeing 737-800');
  assert.equal(forEar('2 -3'), '2 -3');
  assert.equal(forEar('Route 66 – Chicago'), 'Route 66, Chicago');
});

test('without spoken rows, the sample brief is read in the planned order', () => {
  assert.deepEqual(buildScript(withoutSpoken, morning), [
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

test('a day that only starts with the letters of Today is not today', () => {
  const rows = [{ section: 'cal', ord: 0, day: 'Todayish', time: '9 AM', title: 'Standup' }];
  assert.ok(buildScript(rows, morning).includes('Nothing on the calendar today.'));
});

test('a line ending in a question mark or exclamation gets no extra full stop', () => {
  const rows = [{ section: 'meta', ord: 0, greeting: 'Up already!', title: 'Snow today?' }];
  const script = buildScript(rows, morning);
  assert.equal(script[0], 'Up already!');
  assert.equal(script[1], 'Snow today?');
});

test('weather numbers are rounded to the nearest degree and percent', () => {
  // 47.6 rounds up to 48, 33.5 rounds up to 34, 9.5 rounds up to 10.
  const rows = [{ section: 'wx', ord: 0, title: 'Fog', hi: 47.6, lo: '33.5', pop: 9.5 }];
  assert.ok(buildScript(rows, morning).includes("Today's weather: Fog, high 48, low 34, 10 percent chance of rain."));
});

test('a calendar time with no letters or digits is dropped, and the title is read alone', () => {
  const rows = [
    { section: 'cal', ord: 0, day: 'Today', time: '—', title: 'Lunch with Ana' },
    { section: 'cal', ord: 1, day: 'Today', title: 'Call the vet' },
  ];
  const script = buildScript(rows, morning);
  assert.ok(script.includes('Lunch with Ana.'));
  assert.ok(script.includes('Call the vet.'));
});

test('a to-do with an empty or missing title is not counted or read', () => {
  const rows = [
    { section: 'todo', ord: 0, tag: 'Today', title: '' },
    { section: 'todo', ord: 1, tag: 'Friday', title: null },
    { section: 'todo', ord: 2, title: '   ' },
    { section: 'todo', ord: 3, title: 'Feed the cat' },
  ];
  const script = buildScript(rows, morning);
  assert.ok(script.includes('You have 1 to-do.'));
  assert.ok(script.includes('Feed the cat.'));
  assert.ok(!script.some((line) => line.startsWith('Today') || line.startsWith('Friday')));
});

test('a to-do list of blank titles says nothing needs you', () => {
  const rows = [{ section: 'todo', ord: 0, title: '' }];
  assert.ok(buildScript(rows, morning).includes('Nothing needs you this morning.'));
});

test('the sample narration is read in ord order, one sentence per line', () => {
  assert.deepEqual(buildScript(sample, morning), [
    'Good morning.',
    "It's Tuesday, the third of March, and the house is still quiet.",
    'Take your time waking.',
    "There's one thing to do today.",
    'The library books are due back at the Maple Street branch before it closes.',
    'And by Friday, Jordan is waiting on that packing list.',
    'The dentist expects you at two this afternoon.',
    'Then, at half past six, dinner with Sam and Priya.',
    'Outside, it will be partly sunny and cool, with a high of fifty-two.',
    'The rain waits until tomorrow.',
    'In the news, a sample chip maker has opened a new plant.',
    'A sample central bank is holding its rates steady.',
    'And volunteers have finished surveying a sample cave.',
    "That's all for now.",
    "Breathe slowly, and rise when you're ready.",
  ]);
});

test('spoken rows are ordered by ord, not by their place in the file', () => {
  const rows = [
    { section: 'spoken', ord: 2, text: 'Third.' },
    { section: 'meta', ord: 0, title: 'Not read when there is a narration' },
    { section: 'spoken', ord: 0, text: 'First.' },
    { section: 'todo', ord: 0, title: 'Not read either' },
    { section: 'spoken', ord: 1, text: 'Second.' },
  ];
  assert.deepEqual(buildScript(rows, morning), ['First.', 'Second.', 'Third.']);
});

test('a narration splits after . ? and ! followed by a space, keeping closing quotes', () => {
  assert.deepEqual(sentences('Awake yet? Not quite! She said "soon." Then  the kettle.'), [
    'Awake yet?',
    'Not quite!',
    'She said "soon."',
    'Then the kettle.',
  ]);
  // No space after the point, so a decimal or a hyphenated number stays whole.
  assert.deepEqual(sentences('A high of 52.5 today. Call 208-555-0142 later'), [
    'A high of 52.5 today.',
    'Call 208-555-0142 later',
  ]);
});

test('each narration sentence passes through forEar', () => {
  const rows = [{ section: 'spoken', ord: 0, text: 'Coffee & toast — then 2 – 3 PM is free. It will be 40° with 10% rain.' }];
  assert.deepEqual(buildScript(rows, morning), [
    'Coffee and toast, then 2 to 3 PM is free.',
    'It will be 40 degrees with 10 percent rain.',
  ]);
});

test('spoken rows with blank text fall back to the composed script', () => {
  const rows = [
    { section: 'spoken', ord: 0, text: '   ' },
    { section: 'spoken', ord: 1 },
    { section: 'todo', ord: 0, title: 'Water the plants' },
  ];
  assert.deepEqual(buildScript(rows, morning), [
    "Good morning. It's Tuesday, March 3.",
    'You have 1 to-do.',
    'Water the plants.',
    'Nothing on the calendar today.',
    "That's the brief. The details are on screen.",
  ]);
});

test('a stale brief is not read, even with a narration', () => {
  const rows = [
    { section: 'meta', ord: 0, date: '2026-03-02' },
    { section: 'spoken', ord: 0, text: "Good morning. It's Monday." },
  ];
  assert.deepEqual(buildScript(rows, morning), [
    "Good morning. It's Tuesday, March 3.",
    "Today's brief has not arrived, so there is nothing new to read.",
  ]);
});
