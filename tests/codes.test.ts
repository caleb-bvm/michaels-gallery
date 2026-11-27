import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, isValidCodeFormat, isWeakCode, checkCodeLocally } from '../src/lib/codes.ts';

test('normalizes to six upper-case letters and digits', () => {
  assert.equal(normalizeCode(' luz-826 '), 'LUZ826');
  assert.equal(normalizeCode('abcdefgh'), 'ABCDEF');
  assert.equal(normalizeCode('ñandú1'), 'AND1');
});

test('format is exactly six A-Z/0-9', () => {
  assert.ok(isValidCodeFormat('LUZ826'));
  assert.ok(!isValidCodeFormat('LUZ82'));
  assert.ok(!isValidCodeFormat('luz826'));
});

test('weak codes are flagged', () => {
  for (const c of ['AAAAAA', '123456', '654321', 'ABCDEF', 'QWERTY', 'ABABAB', 'ABCABC', '202611', 'ABC123']) {
    assert.ok(isWeakCode(c), c);
  }
  for (const c of ['LUZ826', 'MAR4H7', 'SOFI22', 'K7P2QX']) assert.ok(!isWeakCode(c), c);
});

test('local check states', () => {
  assert.deepEqual(checkCodeLocally(''), { state: 'empty' });
  assert.deepEqual(checkCodeLocally('LUZ'), { state: 'short', missing: 3 });
  assert.deepEqual(checkCodeLocally('111111'), { state: 'weak' });
  assert.deepEqual(checkCodeLocally('LUZ826'), { state: 'ok' });
});
