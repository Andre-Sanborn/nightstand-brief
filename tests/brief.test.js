import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsOf, section, text, number } from '../app/core/brief.js';

test('rowsOf accepts a bare array or an object with rows', () => {
  const rows = [{ section: 'todo', ord: 0 }];
  assert.equal(rowsOf(rows), rows);
  assert.equal(rowsOf({ rows }), rows);
  assert.deepEqual(rowsOf({ rows: 'no' }), []);
  assert.deepEqual(rowsOf(null), []);
});

test('section keeps one section and sorts it by ord', () => {
  const rows = [
    { section: 'todo', ord: 2, title: 'c' },
    { section: 'news', ord: 0, title: 'x' },
    { section: 'todo', ord: 0, title: 'a' },
    null,
    { section: 'todo', ord: '1', title: 'b' },
  ];
  assert.deepEqual(section(rows, 'todo').map((r) => r.title), ['a', 'b', 'c']);
});

test('text trims and turns missing values into an empty string', () => {
  assert.equal(text('  Dentist  '), 'Dentist');
  assert.equal(text(null), '');
  assert.equal(text(undefined), '');
  assert.equal(text(7), '7');
});

// The checker rejects "52°", but the page still shows what it can from a brief that slipped through.
test('number reads a leading number and gives null for nothing numeric', () => {
  assert.equal(number('52°'), 52);
  assert.equal(number('61.4'), 61.4);
  assert.equal(number(34), 34);
  assert.equal(number(''), null);
  assert.equal(number(null), null);
  assert.equal(number('warm'), null);
});
