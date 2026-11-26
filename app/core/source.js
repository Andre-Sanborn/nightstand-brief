const REPO = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;

// Returns null unless both a repository and a token are present and well formed.
export function parseSource(input) {
  const repo = String((input && input.repo) || '').trim();
  const token = String((input && input.token) || '').trim();
  if (!REPO.test(repo) || !token || /\s/.test(token)) return null;
  return { repo, token };
}

export function briefRequest(source, path = 'brief.json') {
  return {
    url: `https://api.github.com/repos/${source.repo}/contents/${path}`,
    headers: {
      Accept: 'application/vnd.github.raw+json',
      Authorization: `Bearer ${source.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
}

// A leading letter or digit keeps out hidden names; no slash keeps the file beside the brief.
const AUDIO = /^[A-Za-z0-9][A-Za-z0-9.-]*\.mp3$/;

// Returns the recording's file name, or null when the brief names none or names it badly.
export function audioName(meta) {
  const name = meta ? meta.audio : undefined;
  return typeof name === 'string' && AUDIO.test(name) ? name : null;
}

// The sample brief (no source) finds its recording beside sample-brief.json.
export function audioRequest(source, name) {
  if (!audioName({ audio: name })) return null;
  return source ? briefRequest(source, name) : { url: name, headers: {} };
}

function localDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// A brief with no date cannot be judged, so it is treated as current.
// A time after the date, as in "2026-11-18T05:30:00-07:00", is ignored.
export function isStale(meta, now) {
  const date = String((meta && meta.date) || '').trim();
  const leading = /^(\d{4}-\d{2}-\d{2})(?!\d)/.exec(date);
  return date !== '' && (leading ? leading[1] : date) !== localDate(now);
}
