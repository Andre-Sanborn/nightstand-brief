import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource, briefRequest, isStale } from '../app/core/source.js';

test('parseSource needs an owner/name repository and a token', () => {
  assert.deepEqual(parseSource({ repo: ' octo/briefs ', token: ' abc123 ' }), { repo: 'octo/briefs', token: 'abc123' });
  assert.equal(parseSource({ repo: 'octo/briefs', token: '' }), null);
  assert.equal(parseSource({ repo: 'briefs', token: 'abc' }), null);
  assert.equal(parseSource({ repo: 'octo/briefs/extra', token: 'abc' }), null);
  assert.equal(parseSource({ repo: 'octo/briefs?x=1', token: 'abc' }), null);
  assert.equal(parseSource({ repo: 'octo/briefs', token: 'two words' }), null);
  assert.equal(parseSource(null), null);
});

test('briefRequest asks the GitHub contents API for the raw file', () => {
  assert.deepEqual(briefRequest({ repo: 'octo/briefs', token: 'abc123' }), {
    url: 'https://api.github.com/repos/octo/briefs/contents/brief.json',
    headers: {
      Accept: 'application/vnd.github.raw+json',
      Authorization: 'Bearer abc123',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
});

test('a brief dated another day is stale; an undated brief is not', () => {
  const morning = new Date('2026-03-03T06:30:00-07:00');
  assert.equal(isStale({ date: '2026-03-03' }, morning), false);
  assert.equal(isStale({ date: '2026-03-02' }, morning), true);
  assert.equal(isStale({}, morning), false);
  // 11:30 PM in Boise is already the next day in UTC; the local date decides.
  assert.equal(isStale({ date: '2026-03-03' }, new Date('2026-03-03T23:30:00-07:00')), false);
});

test('a date followed by a time is judged by its date; anything else non-empty is stale', () => {
  const morning = new Date('2026-11-18T06:30:00-07:00');
  assert.equal(isStale({ date: '2026-11-18T05:30:00-07:00' }, morning), false);
  assert.equal(isStale({ date: '2026-11-18 05:30' }, morning), false);
  assert.equal(isStale({ date: '2026-11-17T23:59:00-07:00' }, morning), true);
  assert.equal(isStale({ date: '2026-11-180' }, morning), true);
  assert.equal(isStale({ date: 'November 18' }, morning), true);
  assert.equal(isStale({ date: '   ' }, morning), false);
});
