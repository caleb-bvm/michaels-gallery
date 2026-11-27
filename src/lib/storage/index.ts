import 'server-only';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/lib/env';

/*
 * Where web-sized previews and site images live. "local" writes to disk and is
 * served through the app (development or a single server). An S3-compatible
 * store (Cloudflare R2, Supabase Storage) plugs in behind the same interface
 * once hosting is chosen.
 */
export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  removePrefix(prefix: string): Promise<void>;
}

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.avif': 'image/avif' };

class LocalStore implements ObjectStore {
  constructor(private root: string) {}

  private file(key: string) {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(path.resolve(this.root) + path.sep)) throw new Error('Bad key');
    return abs;
  }

  async put(key: string, body: Buffer) {
    const abs = this.file(key);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, body);
    await fsp.rename(tmp, abs);
  }

  async get(key: string) {
    const abs = this.file(key);
    if (!fs.existsSync(abs)) return null;
    return { body: await fsp.readFile(abs), contentType: TYPES[path.extname(abs)] ?? 'application/octet-stream' };
  }

  async removePrefix(prefix: string) {
    await fsp.rm(this.file(prefix), { recursive: true, force: true });
  }
}

let store: ObjectStore | null = null;

export function getStore(): ObjectStore {
  if (!store) store = new LocalStore(env.localStorageDir);
  return store;
}

export const previewKey = (albumId: string, photoId: string, size: 'sm' | 'lg', version: number) =>
  `albums/${albumId}/${photoId}-${version}-${size}.webp`;

export const mediaKey = (id: string, size: 'lg' | 'sm') => `media/${id}-${size}.webp`;
