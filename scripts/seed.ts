/*
 * Builds a mock Google Drive on disk from the sample images, so the whole
 * client flow works locally before real Drive credentials exist.
 *   npm run seed            -> .data/mock-drive (or MOCK_DRIVE_DIR)
 * Layout mirrors Drive: <client folder>/<chapter subfolder>/<photo>.jpg
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.MOCK_DRIVE_DIR || '.data/mock-drive');
const src = path.resolve('sample');
const imgs = fs.readdirSync(src).filter((f) => f.endsWith('.jpg')).sort();

const folders: Record<string, Record<string, number>> = {
  '2026-11 Ana y Diego, boda': { '01 Preparativos': 6, '02 Ceremonia': 7, '03 Retratos': 6, '04 Fiesta': 5 },
  '2026-11 Bautizo Mejía': { Iglesia: 5, 'Recepción': 6 },
  '2026-10 Retratos Gómez': { '': 8 },
};

let n = 0;
for (const [folder, chapters] of Object.entries(folders)) {
  const prefix = folder.split(' ').slice(1, 2)[0].slice(0, 2).toUpperCase();
  let file = 412;
  for (const [chapter, count] of Object.entries(chapters)) {
    const dir = path.join(root, folder, chapter);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < count; i++) {
      const from = path.join(src, imgs[n++ % imgs.length]);
      const name = `${prefix}_${String(file).padStart(4, '0')}.jpg`;
      file += 7;
      fs.copyFileSync(from, path.join(dir, name));
    }
  }
}
console.log(`Mock Drive ready at ${root}`);
for (const f of Object.keys(folders)) console.log(`  ${f}`);
