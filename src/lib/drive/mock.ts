import 'server-only';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import sharp from 'sharp';
import type { DriveSource, DriveFolder, DriveImage, FolderScan } from './types';
import { naturalCompare, sortChapters } from './names';

/*
 * A stand-in for Google Drive that reads a folder on disk. The layout mirrors
 * Drive: MOCK_DRIVE_DIR/<client folder>/<chapter subfolder>/<photo>.jpg
 * IDs are the base64url of the path relative to the root.
 */

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.avif': 'image/avif',
};

export class MockDrive implements DriveSource {
  constructor(private root: string) {}

  private id(rel: string) {
    return Buffer.from(rel).toString('base64url');
  }

  private resolve(id: string) {
    const rel = Buffer.from(id, 'base64url').toString('utf8');
    const abs = path.resolve(this.root, rel);
    if (!abs.startsWith(path.resolve(this.root) + path.sep)) throw new Error('Not found');
    return abs;
  }

  async listClientFolders(): Promise<DriveFolder[]> {
    if (!fs.existsSync(this.root)) return [];
    const entries = await fsp.readdir(this.root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({ id: this.id(e.name), name: e.name }))
      .sort((a, b) => naturalCompare(b.name, a.name));
  }

  private async images(dirAbs: string): Promise<DriveImage[]> {
    const entries = await fsp.readdir(dirAbs, { withFileTypes: true });
    const out: DriveImage[] = [];
    for (const e of entries) {
      const mime = EXT_MIME[path.extname(e.name).toLowerCase()];
      if (!e.isFile() || !mime) continue;
      const abs = path.join(dirAbs, e.name);
      const buf = await fsp.readFile(abs);
      out.push({
        id: this.id(path.relative(this.root, abs)),
        name: e.name,
        mime,
        size: buf.length,
        md5: crypto.createHash('md5').update(buf).digest('hex'),
      });
    }
    return out.sort((a, b) => naturalCompare(a.name, b.name));
  }

  async scanFolder(folderId: string): Promise<FolderScan> {
    const abs = this.resolve(folderId);
    const looseImages = await this.images(abs);
    const subs = (await fsp.readdir(abs, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith('.'));
    const chapters = [];
    for (const s of sortChapters(subs.map((d) => ({ rawName: d.name })))) {
      const subAbs = path.join(abs, s.rawName);
      chapters.push({
        driveFolderId: this.id(path.relative(this.root, subAbs)),
        name: s.name,
        sort: s.sort,
        images: await this.images(subAbs),
      });
    }
    const all = [...looseImages, ...chapters.flatMap((c) => c.images)];
    return {
      folder: { id: folderId, name: path.basename(abs) },
      looseImages,
      chapters: chapters.filter((c) => c.images.length),
      photoCount: all.length,
      totalBytes: all.reduce((s, i) => s + i.size, 0),
    };
  }

  async openOriginal(fileId: string): Promise<Readable> {
    return fs.createReadStream(this.resolve(fileId));
  }

  async thumbnail(fileId: string): Promise<Buffer | null> {
    return sharp(this.resolve(fileId)).rotate().resize(400, 400, { fit: 'inside' }).webp({ quality: 70 }).toBuffer();
  }
}
