export function rowsOf(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.rows)) return json.rows;
  return [];
}

export function section(rows, name) {
  return rows
    .filter((r) => r && r.section === name)
    .sort((a, b) => (Number(a.ord) || 0) - (Number(b.ord) || 0));
}

export function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

export function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}
