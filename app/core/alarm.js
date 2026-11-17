// Accepts "6:30", "06:30" or "18:05" on a 24-hour clock.
export function parseTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
}

// Local wall-clock time, so a daylight-saving change overnight still rings at the set time.
export function nextAlarm(now, time) {
  const at = new Date(now.getTime());
  at.setHours(time.h, time.min, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

export function isDue(nowMs, alarmMs) {
  return nowMs >= alarmMs;
}

const MINUTE = 60_000;
export const MISSED_AFTER_MINUTES = 60;

// A page frozen overnight and resumed much later should not ring in the afternoon.
export function dueAction(nowMs, alarmMs) {
  if (nowMs < alarmMs) return 'wait';
  return nowMs - alarmMs > MISSED_AFTER_MINUTES * MINUTE ? 'missed' : 'ring';
}

export function minutesLate(nowMs, alarmMs) {
  return Math.max(0, Math.floor((nowMs - alarmMs) / MINUTE));
}

// Refreshes faster just before the alarm, so a brief written late is still picked up.
export function refreshEvery(nowMs, alarmMs) {
  const ahead = alarmMs - nowMs;
  return ahead >= 0 && ahead <= 15 * MINUTE ? 2 * MINUTE : 10 * MINUTE;
}

export function formatClock(date) {
  const h24 = date.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const min = String(date.getMinutes()).padStart(2, '0');
  return { time: `${h}:${min}`, suffix: h24 < 12 ? 'AM' : 'PM' };
}
