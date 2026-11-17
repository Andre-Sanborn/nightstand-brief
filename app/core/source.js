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

function localDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// A brief with no date cannot be judged, so it is treated as current.
export function isStale(meta, now) {
  const date = String((meta && meta.date) || '').trim();
  return date !== '' && date !== localDate(now);
}
