import 'server-only';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { sign, verify, hmac } from '@/lib/crypto';
import { env } from '@/lib/env';

/*
 * After a code works, the browser gets a signed HttpOnly cookie instead of
 * keeping the code. Every gallery request re-checks the album: closed,
 * expired or a changed code (version bump) ends the session.
 */

const COOKIE = 'mg_gallery';
const MAX_SESSION_MS = 30 * 24 * 3600 * 1000;

export type Role = 'client' | 'guest';
interface Payload {
  a: string;
  v: number;
  r: Role;
  exp: number;
}

export async function startSession(albumId: string, codeVersion: number, role: Role, albumExpires: Date) {
  const exp = Math.min(Date.now() + MAX_SESSION_MS, albumExpires.getTime());
  const token = sign('gallery-session', { a: albumId, v: codeVersion, r: role, exp } satisfies Payload);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export type Album = typeof schema.albums.$inferSelect;

export function albumIsOpen(album: Album, now = new Date()) {
  return album.status === 'live' && album.expiresAt > now;
}

/** The unlocked album for this browser, or null. */
export async function currentGallery(): Promise<{ album: Album; role: Role } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  const p = verify<Payload>('gallery-session', token);
  if (!p) return null;
  const db = await getDb();
  const [album] = await db.select().from(schema.albums).where(eq(schema.albums.id, p.a)).limit(1);
  if (!album || album.codeVersion !== p.v || !albumIsOpen(album)) return null;
  return { album, role: p.r };
}

/* ---- signed preview URLs ------------------------------------------------ */

const BUCKET = 6 * 3600 * 1000;

/** Preview links expire after 6 to 12 hours; bucketing keeps them cacheable. */
export function previewUrl(photoId: string, size: 'sm' | 'lg', version: number, now = Date.now()) {
  const e = Math.ceil(now / BUCKET) * BUCKET + BUCKET;
  const s = hmac('preview', `${photoId}:${size}:${version}:${e}`).slice(0, 22);
  return `/api/p/${photoId}/${size}?v=${version}&e=${e}&s=${s}`;
}

export function checkPreviewSig(photoId: string, size: string, version: string, e: string, s: string) {
  const exp = Number(e);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return hmac('preview', `${photoId}:${size}:${version}:${exp}`).slice(0, 22) === s;
}
