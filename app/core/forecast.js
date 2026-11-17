const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_ROWS = 7;

// Period times carry the forecast office's own offset, so the date is read from the text.
function dateOf(isoTime) {
  return String(isoTime).slice(0, 10);
}

function dayName(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function chance(period) {
  const value = period && period.probabilityOfPrecipitation && period.probabilityOfPrecipitation.value;
  return Number.isFinite(value) ? value : 0;
}

// Drops periods that are over: any that ended before today, and a leading night that
// ends this morning. A feed served late then starts on the right day or yields nothing for it.
export function currentPeriods(periods, today) {
  const list = (Array.isArray(periods) ? periods : []).filter((p) => dateOf(p.endTime) >= today);
  if (list.length && !list[0].isDaytime && dateOf(list[0].endTime) === today) list.shift();
  return list;
}

export function startsToday(periods, today) {
  const list = currentPeriods(periods, today);
  return list.length > 0 && dateOf(list[0].startTime) === today;
}

// Turns National Weather Service forecast periods into wx rows, one per calendar day.
// `today` is the local date as YYYY-MM-DD.
export function forecastRows(periods, today) {
  const list = currentPeriods(periods, today);

  const rows = [];
  let i = 0;
  while (i < list.length && rows.length < MAX_ROWS) {
    const first = list[i];
    const date = dateOf(first.startTime);
    const row = { section: 'wx', ord: rows.length, day: dayName(date), title: first.shortForecast };
    if (first.isDaytime) {
      const night = list[i + 1] && !list[i + 1].isDaytime ? list[i + 1] : null;
      row.hi = first.temperature;
      if (night) row.lo = night.temperature;
      row.pop = Math.max(chance(first), chance(night));
      i += night ? 2 : 1;
    } else {
      // An evening run starts with tonight: the day has a low and no high left to report.
      row.lo = first.temperature;
      row.pop = chance(first);
      i += 1;
    }
    rows.push(row);
  }
  return rows;
}
