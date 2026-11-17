import test from 'node:test';
import assert from 'node:assert/strict';
import { dueAction } from '../app/core/alarm.js';
import {
  softWakeMinutes, softStart, wakePhase, softProgress, dawnRgb, dawnColour, inkFor, LIGHT_INK, DARK_INK,
  chimeGain, chimeGapMs, nextNote, CHIME_HZ, ownerUp, AWAKE_WINDOW_MS,
} from '../app/core/softwake.js';

const MIN = 60_000;
const SEC = 1_000;

test('softWakeMinutes accepts only the offered choices and defaults to 5', () => {
  assert.equal(softWakeMinutes(0), 0);
  assert.equal(softWakeMinutes(3), 3);
  assert.equal(softWakeMinutes(10), 10);
  assert.equal(softWakeMinutes(null), 5);
  assert.equal(softWakeMinutes(7), 5);
  assert.equal(softWakeMinutes('5'), 5);
});

test('softStart is the alarm minus the length when armed long before', () => {
  const alarm = new Date('2026-11-18T06:30:00-07:00').getTime();
  const armed = new Date('2026-11-17T22:15:00-07:00').getTime();
  assert.equal(softStart(alarm, armed, 5 * MIN), new Date('2026-11-18T06:25:00-07:00').getTime());
  assert.equal(softStart(alarm, armed, 0), alarm);
});

test('arming inside the window starts the soft wake at the arming time', () => {
  const alarm = 1_000 * MIN;
  assert.equal(softStart(alarm, alarm - 2 * MIN, 5 * MIN), alarm - 2 * MIN);
  assert.equal(softStart(alarm, alarm - 5 * MIN, 5 * MIN), alarm - 5 * MIN);
  assert.equal(softStart(alarm, alarm - 5 * MIN - 1, 5 * MIN), alarm - 5 * MIN);
  // The compressed test run: armed 60 s ahead with 30 s of soft wake.
  assert.equal(softStart(alarm, alarm - 60 * SEC, 30 * SEC), alarm - 30 * SEC);
});

test('softStart never moves past the alarm and keeps the full length with no arming time', () => {
  const alarm = 1_000 * MIN;
  assert.equal(softStart(alarm, alarm + MIN, 5 * MIN), alarm);
  assert.equal(softStart(alarm, null, 5 * MIN), alarm - 5 * MIN);
});

test('wakePhase waits, then softens, then rings, then calls it missed', () => {
  const alarm = 1_000 * MIN;
  const start = alarm - 5 * MIN;
  assert.equal(wakePhase(start - 1, alarm, start), 'wait');
  assert.equal(wakePhase(start, alarm, start), 'soft');
  assert.equal(wakePhase(alarm - 1, alarm, start), 'soft');
  assert.equal(wakePhase(alarm, alarm, start), 'ring');
  assert.equal(wakePhase(alarm + 60 * MIN, alarm, start), 'ring');
  assert.equal(wakePhase(alarm + 60 * MIN + 1, alarm, start), 'missed');
});

test('wakePhase with soft wake off is dueAction', () => {
  const alarm = 1_000 * MIN;
  for (const now of [alarm - 6 * MIN, alarm - 1, alarm, alarm + 60 * MIN, alarm + 60 * MIN + 1, alarm + 900 * MIN]) {
    assert.equal(wakePhase(now, alarm, alarm), dueAction(now, alarm));
  }
});

test('softProgress runs 0 to 1 across the window and clamps outside it', () => {
  const alarm = 1_000 * MIN;
  const start = alarm - 5 * MIN;
  assert.equal(softProgress(start - MIN, start, alarm), 0);
  assert.equal(softProgress(start, start, alarm), 0);
  assert.equal(softProgress(start + 150 * SEC, start, alarm), 0.5);
  assert.equal(softProgress(start + 60 * SEC, start, alarm), 0.2);
  assert.equal(softProgress(alarm, start, alarm), 1);
  assert.equal(softProgress(alarm + MIN, start, alarm), 1);
});

test('softProgress with no window is 0 before the alarm and 1 from it', () => {
  const alarm = 1_000 * MIN;
  assert.equal(softProgress(alarm - 1, alarm, alarm), 0);
  assert.equal(softProgress(alarm, alarm, alarm), 1);
});

test('dawn colour runs black to white through the stops', () => {
  // Stops sit at eased 0, 1/4, 1/2, 3/4, 1, so at progress 0, 0.5, sqrt(0.5), sqrt(0.75), 1.
  assert.deepEqual(dawnRgb(0), [0, 0, 0]);
  assert.deepEqual(dawnRgb(0.5), [110, 8, 0]);
  assert.deepEqual(dawnRgb(Math.SQRT1_2), [255, 140, 20]);
  assert.deepEqual(dawnRgb(Math.sqrt(0.75)), [255, 214, 170]);
  assert.deepEqual(dawnRgb(1), [255, 255, 255]);
  assert.equal(dawnColour(0), 'rgb(0, 0, 0)');
  assert.equal(dawnColour(1), 'rgb(255, 255, 255)');
});

test('dawn colour interpolates between stops on the squared progress', () => {
  // 0.75 squared is 0.5625, a quarter of the way from amber to warm white:
  // 140 + 74/4 = 158.5 and 20 + 150/4 = 57.5, both rounding up.
  assert.deepEqual(dawnRgb(0.75), [255, 159, 58]);
  // A third of the way in, eased 1/9, is 4/9 of the way from black to deep red.
  assert.deepEqual(dawnRgb(1 / 3), [49, 4, 0]);
});

test('dawn colour clamps outside 0..1', () => {
  assert.deepEqual(dawnRgb(-0.5), [0, 0, 0]);
  assert.deepEqual(dawnRgb(1.5), [255, 255, 255]);
  assert.deepEqual(dawnRgb(Number.NaN), [0, 0, 0]);
});

test('dawn brightness never falls across 0..1 in steps of 0.01', () => {
  let before = [-1, -1, -1];
  for (let i = 0; i <= 100; i += 1) {
    const rgb = dawnRgb(i / 100);
    rgb.forEach((v, k) => assert.ok(v >= (before[k] ?? 0), `channel ${k} fell at ${i / 100}`));
    before = rgb;
  }
});

test('the first third of the soft wake stays very dark', () => {
  for (let i = 0; i <= 33; i += 1) {
    const [r, g, b] = dawnRgb(i / 100);
    assert.ok(r <= 50 && g <= 5 && b === 0, `too bright at ${i / 100}`);
  }
});

test('inkFor picks the light ink on dark stops and the dark ink on bright ones', () => {
  assert.equal(inkFor([0, 0, 0]), LIGHT_INK);
  assert.equal(inkFor([110, 8, 0]), LIGHT_INK);
  assert.equal(inkFor([255, 140, 20]), DARK_INK);
  assert.equal(inkFor([255, 255, 255]), DARK_INK);
});

test('chime gain rises from 0.02 to 0.35 and clamps', () => {
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} is not ${expected}`);
  near(chimeGain(0), 0.02);
  near(chimeGain(1), 0.35);
  near(chimeGain(-1), 0.02);
  near(chimeGain(2), 0.35);
  near(chimeGain(0.5), 0.185);
});

test('chimes come 3 to 5 seconds apart', () => {
  assert.equal(chimeGapMs(0), 3000);
  assert.equal(chimeGapMs(0.5), 4000);
  assert.equal(chimeGapMs(1), 5000);
  assert.equal(chimeGapMs(7), 5000);
});

test('nextNote never repeats the previous note and reaches every other one', () => {
  for (let prev = 0; prev < CHIME_HZ.length; prev += 1) {
    const seen = new Set();
    for (let r = 0; r < 1; r += 0.01) {
      const n = nextNote(prev, r);
      assert.notEqual(n, prev);
      assert.ok(n >= 0 && n < CHIME_HZ.length);
      seen.add(n);
    }
    assert.equal(seen.size, CHIME_HZ.length - 1);
  }
});

test('nextNote with no previous note can pick any note, and stays in range at r = 1', () => {
  assert.equal(nextNote(-1, 0), 0);
  assert.equal(nextNote(-1, 0.999), CHIME_HZ.length - 1);
  assert.equal(nextNote(-1, 1), CHIME_HZ.length - 1);
  assert.equal(nextNote(CHIME_HZ.length - 1, 1), CHIME_HZ.length - 2);
  assert.equal(nextNote(0, 0), 1);
});

test('the owner is up while speech plays or within 2 minutes of a touch', () => {
  const alarm = 1_000 * MIN;
  assert.equal(AWAKE_WINDOW_MS, 2 * MIN);
  assert.equal(ownerUp(alarm, null, true), true);
  assert.equal(ownerUp(alarm, null, false), false);
  assert.equal(ownerUp(alarm, alarm - MIN, false), true);
  assert.equal(ownerUp(alarm, alarm - 2 * MIN, false), true);
  assert.equal(ownerUp(alarm, alarm - 2 * MIN - 1, false), false);
  // Tapped at 6:27 for a 6:30 alarm, then nothing.
  assert.equal(ownerUp(alarm, alarm - 3 * MIN, false), false);
});
