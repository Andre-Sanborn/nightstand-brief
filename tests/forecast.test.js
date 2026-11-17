import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastRows } from '../app/core/forecast.js';

const period = (startTime, endTime, isDaytime, temperature, shortForecast, pop) => ({
  startTime, endTime, isDaytime, temperature, shortForecast, probabilityOfPrecipitation: { value: pop },
});

// 2026-11-18 is a Wednesday.
const overnight = period('2026-11-18T05:00:00-07:00', '2026-11-18T06:00:00-07:00', false, 30, 'Mostly Clear', 6);
const wedDay = period('2026-11-18T06:00:00-07:00', '2026-11-18T18:00:00-07:00', true, 48, 'Rain Showers Likely', 58);
const wedNight = period('2026-11-18T18:00:00-07:00', '2026-11-19T06:00:00-07:00', false, 34, 'Rain Showers', 80);
const thuDay = period('2026-11-19T06:00:00-07:00', '2026-11-19T18:00:00-07:00', true, 46, 'Showers', null);
const thuNight = period('2026-11-19T18:00:00-07:00', '2026-11-20T06:00:00-07:00', false, 32, 'Cloudy', 20);

test('a run before 6 AM drops the night that is ending and starts with today', () => {
  assert.deepEqual(forecastRows([overnight, wedDay, wedNight, thuDay, thuNight], '2026-11-18'), [
    { section: 'wx', ord: 0, day: 'Wed', title: 'Rain Showers Likely', hi: 48, lo: 34, pop: 80 },
    { section: 'wx', ord: 1, day: 'Thu', title: 'Showers', hi: 46, lo: 32, pop: 20 },
  ]);
});

test('a daytime run pairs each day with the night after it', () => {
  assert.deepEqual(forecastRows([wedDay, wedNight, thuDay], '2026-11-18'), [
    { section: 'wx', ord: 0, day: 'Wed', title: 'Rain Showers Likely', hi: 48, lo: 34, pop: 80 },
    { section: 'wx', ord: 1, day: 'Thu', title: 'Showers', hi: 46, pop: 0 },
  ]);
});

test('an evening run keeps tonight as today, with a low and no high', () => {
  assert.deepEqual(forecastRows([wedNight, thuDay, thuNight], '2026-11-18'), [
    { section: 'wx', ord: 0, day: 'Wed', title: 'Rain Showers', lo: 34, pop: 80 },
    { section: 'wx', ord: 1, day: 'Thu', title: 'Showers', hi: 46, lo: 32, pop: 20 },
  ]);
});

test('no more than seven rows, and nothing from nothing', () => {
  const many = [];
  for (let d = 1; d <= 9; d += 1) {
    const day = `2026-12-0${d}`;
    many.push(period(`${day}T06:00:00-07:00`, `${day}T18:00:00-07:00`, true, 40 + d, 'Clear', 0));
  }
  const rows = forecastRows(many, '2026-12-01');
  assert.equal(rows.length, 7);
  // 2026-12-01 is a Tuesday, so the seventh row is the following Monday.
  assert.deepEqual(rows.map((r) => r.day), ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']);
  assert.deepEqual(rows.map((r) => r.hi), [41, 42, 43, 44, 45, 46, 47]);
  assert.deepEqual(forecastRows(undefined, '2026-12-01'), []);
});
