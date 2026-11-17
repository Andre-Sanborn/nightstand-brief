import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVote, voteFor } from '../app/core/votes.js';

const story = { id: 's1', topic: 'Markets', title: 'Rates hold' };

test('a vote is recorded with its story and time', () => {
  assert.deepEqual(applyVote([], story, 'up', '2026-03-03T13:00:00Z'), [
    { id: 's1', topic: 'Markets', title: 'Rates hold', vote: 'up', at: '2026-03-03T13:00:00Z' },
  ]);
});

test('a second vote on the same story replaces the first', () => {
  const first = applyVote([], story, 'up', 't1');
  const second = applyVote(first, story, 'never', 't2');
  assert.equal(second.length, 1);
  assert.equal(voteFor(second, 's1'), 'never');
});

test('repeating a vote withdraws it', () => {
  const first = applyVote([], story, 'down', 't1');
  assert.deepEqual(applyVote(first, story, 'down', 't2'), []);
});

test('an unknown vote changes nothing and other stories are kept', () => {
  const votes = applyVote([], { id: 'other' }, 'up', 't0');
  assert.equal(applyVote(votes, story, 'sideways', 't1'), votes);
  assert.equal(voteFor(applyVote(votes, story, 'up', 't1'), 'other'), 'up');
  assert.equal(voteFor(votes, 's1'), null);
});
