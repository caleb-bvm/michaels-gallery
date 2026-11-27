import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { zipStream } from '../src/lib/zip.ts';
import { splitParts } from '../src/lib/zipparts.ts';

test('streams a valid stored ZIP with UTF-8 names', async () => {
  const files = { 'Ceremonia/AN_0001.jpg': Buffer.alloc(70_000, 7), 'Recepción/foto ñ.jpg': Buffer.from('hola') };
  const chunks: Uint8Array[] = [];
  const entries = Object.entries(files).map(([name, data]) => ({
    name,
    open: async () => (async function* () {
      yield data.subarray(0, 1000);
      yield data.subarray(1000);
    })(),
  }));
  for await (const c of zipStream(entries)) chunks.push(c);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'));
  const zip = path.join(dir, 'a.zip');
  fs.writeFileSync(zip, Buffer.concat(chunks));
  const py = `import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nprint('|'.join(f"{i.filename}:{i.file_size}" for i in z.infolist()))`;
  const out = execFileSync('python3', ['-c', py, zip]).toString().trim();
  assert.equal(out, 'Ceremonia/AN_0001.jpg:70000|Recepción/foto ñ.jpg:4');
});

test('splits into parts under the limit, keeping order', () => {
  const items = [5, 5, 5, 9, 1, 1].map((sizeBytes, i) => ({ i, sizeBytes }));
  const parts = splitParts(items, 10);
  assert.deepEqual(parts.map((p) => p.map((x) => x.i)), [[0, 1], [2], [3, 4], [5]]);
  assert.deepEqual(splitParts([{ sizeBytes: 50 }], 10).length, 1);
});
