// Reads a National Weather Service forecast on standard input and prints today's wx rows as JSON.
// The fetch is left to curl, which honours the cloud environment's proxy.
import { forecastRows } from '../app/core/forecast.js';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let periods;
try {
  periods = JSON.parse(input).properties.periods;
} catch {
  console.error('The input is not a forecast from the weather service.');
  process.exit(1);
}

const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const rows = forecastRows(periods, today);
if (!rows.length) {
  console.error('The forecast held no periods.');
  process.exit(1);
}
console.log(JSON.stringify(rows, null, 1));
