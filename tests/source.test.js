import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource, briefRequest, isStale, audioName, audioRequest } from '../app/core/source.js';

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

test('audioName accepts letters, digits, dots and hyphens ending in .mp3', () => {
  assert.equal(audioName({ audio: 'brief-2026-11-26-3fa9c1d2.mp3' }), 'brief-2026-11-26-3fa9c1d2.mp3');
  assert.equal(audioName({ audio: 'A.b-9.mp3' }), 'A.b-9.mp3');
  assert.equal(audioName({ audio: '7.mp3' }), '7.mp3');
});

test('audioName returns null for anything else', () => {
  for (const audio of [
    undefined, null, '', 42, ['a.mp3'],
    '.mp3', '.hidden.mp3', '-x.mp3', // no leading letter or digit
    'brief.MP3', 'brief.wav', 'brief.mp3.txt', 'brief', // wrong ending
    'audio/brief.mp3', '../brief.mp3', 'a\\b.mp3', // a path
    'brief 1.mp3', 'brief_1.mp3', 'brief%2F.mp3', 'brief?.mp3', 'brïef.mp3', ' brief.mp3',
  ]) {
    assert.equal(audioName({ audio }), null, String(audio));
  }
  assert.equal(audioName({}), null);
  assert.equal(audioName(null), null);
});

test('audioRequest asks the brief repository for the raw recording', () => {
  assert.deepEqual(audioRequest({ repo: 'octo/briefs', token: 'abc123' }, 'brief-2026-11-26-3fa9c1d2.mp3'), {
    url: 'https://api.github.com/repos/octo/briefs/contents/brief-2026-11-26-3fa9c1d2.mp3',
    headers: {
      Accept: 'application/vnd.github.raw+json',
      Authorization: 'Bearer abc123',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
});

test('audioRequest for the sample brief is a relative path with no token', () => {
  assert.deepEqual(audioRequest(null, 'sample-tone.mp3'), { url: 'sample-tone.mp3', headers: {} });
});

test('audioRequest refuses a name that is not a plain .mp3 file name', () => {
  assert.equal(audioRequest({ repo: 'octo/briefs', token: 'abc123' }, '../secrets.mp3'), null);
  assert.equal(audioRequest(null, 'https://example.com/a.mp3'), null);
  assert.equal(audioRequest(null, undefined), null);
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
