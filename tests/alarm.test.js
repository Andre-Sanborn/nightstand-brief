import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, nextAlarm, isDue, dueAction, minutesLate, refreshEvery, formatClock } from '../app/core/alarm.js';

// The npm script pins TZ=America/Boise: UTC-7 in winter, UTC-6 in summer.

test('parseTime reads 24-hour times and rejects nonsense', () => {
  assert.deepEqual(parseTime('6:30'), { h: 6, min: 30 });
  assert.deepEqual(parseTime('18:05'), { h: 18, min: 5 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('6:60'), null);
  assert.equal(parseTime('six thirty'), null);
  assert.equal(parseTime('6:30pm'), null);
  assert.equal(parseTime('at 6:30'), null);
  assert.equal(parseTime('106:30'), null);
  assert.equal(parseTime('6:305'), null);
});

test('an evening arm rings the next morning', () => {
  const now = new Date('2026-11-17T22:15:00-07:00');
  assert.equal(nextAlarm(now, { h: 6, min: 30 }).toISOString(), '2026-11-18T13:30:00.000Z');
});

test('an arm after midnight rings the same morning', () => {
  const now = new Date('2026-11-18T05:00:00-07:00');
  assert.equal(nextAlarm(now, { h: 6, min: 30 }).toISOString(), '2026-11-18T13:30:00.000Z');
});

test('arming at the alarm minute waits a full day', () => {
  const now = new Date('2026-11-18T06:30:00-07:00');
  assert.equal(nextAlarm(now, { h: 6, min: 30 }).toISOString(), '2026-11-19T13:30:00.000Z');
});

test('the alarm keeps its wall-clock time across the spring clock change', () => {
  // Clocks go forward on 2027-03-14, so 6:30 AM that morning is 12:30 UTC, not 13:30.
  const now = new Date('2027-03-13T22:00:00-07:00');
  assert.equal(nextAlarm(now, { h: 6, min: 30 }).toISOString(), '2027-03-14T12:30:00.000Z');
});

test('isDue is true from the alarm instant onward', () => {
  assert.equal(isDue(999, 1000), false);
  assert.equal(isDue(1000, 1000), true);
  assert.equal(isDue(5000, 1000), true);
});

test('formatClock uses a 12-hour clock', () => {
  assert.deepEqual(formatClock(new Date('2026-11-18T00:05:00-07:00')), { time: '12:05', suffix: 'AM' });
  assert.deepEqual(formatClock(new Date('2026-11-18T12:00:00-07:00')), { time: '12:00', suffix: 'PM' });
  assert.deepEqual(formatClock(new Date('2026-11-18T21:09:00-07:00')), { time: '9:09', suffix: 'PM' });
});

const MIN = 60_000;

test('dueAction waits before the alarm, rings up to 60 minutes late, then calls it missed', () => {
  const alarm = 1_000 * MIN;
  assert.equal(dueAction(alarm - 1, alarm), 'wait');
  assert.equal(dueAction(alarm, alarm), 'ring');
  assert.equal(dueAction(alarm + 60 * MIN, alarm), 'ring');
  assert.equal(dueAction(alarm + 60 * MIN + 1, alarm), 'missed');
  // 10:15 PM to 2:00 PM the next day is 15 h 45 min.
  const armedAt = new Date('2026-11-17T22:15:00-07:00').getTime();
  const sixThirty = new Date('2026-11-18T06:30:00-07:00').getTime();
  assert.equal(dueAction(new Date('2026-11-18T14:00:00-07:00').getTime(), sixThirty), 'missed');
  assert.equal(dueAction(armedAt, sixThirty), 'wait');
});

test('minutesLate counts whole minutes past the alarm', () => {
  const alarm = 1_000 * MIN;
  assert.equal(minutesLate(alarm - MIN, alarm), 0);
  assert.equal(minutesLate(alarm + 59_999, alarm), 0);
  assert.equal(minutesLate(alarm + MIN, alarm), 1);
  assert.equal(minutesLate(alarm + 450 * MIN, alarm), 450);
});

test('the brief refreshes every 2 minutes in the 15 minutes before the alarm, otherwise every 10', () => {
  const alarm = 1_000 * MIN;
  assert.equal(refreshEvery(alarm - 15 * MIN - 1, alarm), 10 * MIN);
  assert.equal(refreshEvery(alarm - 15 * MIN, alarm), 2 * MIN);
  assert.equal(refreshEvery(alarm - 1, alarm), 2 * MIN);
  assert.equal(refreshEvery(alarm, alarm), 2 * MIN);
  assert.equal(refreshEvery(alarm + 1, alarm), 10 * MIN);
});
