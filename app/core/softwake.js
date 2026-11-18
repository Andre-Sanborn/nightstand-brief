import { dueAction } from './alarm.js';

const MINUTE = 60_000;

export const SOFT_WAKE_MINUTES = [0, 3, 5, 10];
export const DEFAULT_SOFT_WAKE_MINUTES = 5;
// A touch this recent at the alarm time means the owner is up and the alarm is skipped.

// A pentatonic scale has no clashing pair, so any note can follow any other.
export const CHIME_HZ = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

const DAWN = [
  [0, 0, 0], // black
  [110, 8, 0], // deep red
  [255, 140, 20], // amber
  [255, 214, 170], // warm white
  [255, 255, 255], // white
];
export const LIGHT_INK = '#e09070';
export const DARK_INK = '#2a0e00';

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function softWakeMinutes(stored) {
  return SOFT_WAKE_MINUTES.includes(stored) ? stored : DEFAULT_SOFT_WAKE_MINUTES;
}

// Arming inside the window shortens it, so the light starts from black at the arming tap.
// An alarm stored without an arming time keeps the full length.
export function softStart(alarmMs, armedMs, lengthMs) {
  const room = armedMs === null || armedMs === undefined ? lengthMs : alarmMs - armedMs;
  return alarmMs - Math.max(0, Math.min(lengthMs, room));
}

// Keeps dueAction's lateness rules from the alarm instant onward.
export function wakePhase(nowMs, alarmMs, softStartMs) {
  if (nowMs >= alarmMs) return dueAction(nowMs, alarmMs);
  return nowMs >= softStartMs ? 'soft' : 'wait';
}

export function softProgress(nowMs, softStartMs, alarmMs) {
  const length = alarmMs - softStartMs;
  if (length <= 0) return nowMs >= alarmMs ? 1 : 0;
  return clamp01((nowMs - softStartMs) / length);
}

// Squaring the progress keeps the first third of the window very dark.
export function dawnRgb(progress) {
  const p = clamp01(progress);
  const span = p * p * (DAWN.length - 1);
  const i = Math.min(Math.floor(span), DAWN.length - 2);
  const f = span - i;
  const from = DAWN[i] ?? [0, 0, 0];
  const to = DAWN[i + 1] ?? from;
  return from.map((v, k) => Math.round(v + ((to[k] ?? v) - v) * f));
}

export function dawnColour(progress) {
  return `rgb(${dawnRgb(progress).join(', ')})`;
}

// WCAG relative luminance of an sRGB colour.
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function hexRgb(hex) {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

// The text takes whichever ink stands out more from the light behind it.
export function inkFor(rgb) {
  return contrast(rgb, hexRgb(LIGHT_INK)) >= contrast(rgb, hexRgb(DARK_INK)) ? LIGHT_INK : DARK_INK;
}

export function chimeGain(progress) {
  return 0.02 + 0.33 * clamp01(progress);
}

export function chimeGapMs(random) {
  return 3000 + 2000 * clamp01(random);
}

// Never repeats the previous note, so no note can sound three times running.
export function nextNote(previous, random) {
  const count = CHIME_HZ.length;
  const hasPrevious = Number.isInteger(previous) && previous >= 0 && previous < count;
  const choices = hasPrevious ? count - 1 : count;
  let i = Math.min(Math.floor(clamp01(random) * choices), choices - 1);
  if (hasPrevious && i >= previous) i += 1;
  return i;
}
