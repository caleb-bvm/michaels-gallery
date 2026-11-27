import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChapterName, sortChapters } from '../src/lib/drive/names.ts';

test('numeric prefixes set the order and are hidden', () => {
  assert.deepEqual(parseChapterName('01 Preparativos'), { name: 'Preparativos', order: 1 });
  assert.deepEqual(parseChapterName('2 - Ceremonia'), { name: 'Ceremonia', order: 2 });
  assert.deepEqual(parseChapterName('03_Fiesta'), { name: 'Fiesta', order: 3 });
  assert.deepEqual(parseChapterName('Retratos'), { name: 'Retratos', order: null });
  assert.deepEqual(parseChapterName('2026'), { name: '2026', order: null });
});

test('prefixed chapters first, then alphabetical', () => {
  const out = sortChapters([{ rawName: 'Retratos' }, { rawName: '10 Noche' }, { rawName: '02 Ceremonia' }, { rawName: 'Detalles' }, { rawName: '1 Preparativos' }]);
  assert.deepEqual(out.map((c) => c.name), ['Preparativos', 'Ceremonia', 'Noche', 'Detalles', 'Retratos']);
  assert.deepEqual(out.map((c) => c.sort), [0, 1, 2, 3, 4]);
});
