'use server';

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { isValidCodeFormat, normalizeCode } from '@/lib/codes';
import { codeHash, logEvent } from '@/lib/albums';
import { isBlocked, recordAttempt } from '@/lib/ratelimit';
import { clientIp, describeVisitor } from '@/lib/request';
import { previewUrl, startSession, type Role } from '@/lib/session';
import { randomId } from '@/lib/crypto';
import { env } from '@/lib/env';

export type UnlockResult =
  | { status: 'ok'; reveal: { name: string; place: string; date: string | null; count: number; cover: string | null } }
  | { status: 'wrong' | 'blocked' | 'preparing' | 'error' }
  | { status: 'expired'; closedOn: string };

async function deviceId() {
  const jar = await cookies();
  let id = jar.get('mg_d')?.value;
  if (!id || id.length > 40) {
    id = randomId(12);
    jar.set('mg_d', id, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', maxAge: 400 * 24 * 3600 });
  }
  return id;
}

export async function unlock(raw: string): Promise<UnlockResult> {
  try {
    const ip = await clientIp();
    const device = await deviceId();
    if (await isBlocked(ip, device)) return { status: 'blocked' };

    const code = normalizeCode(raw);
    const db = await getDb();
    const [row] = isValidCodeFormat(code)
      ? await db
          .select({ album: schema.albums, role: schema.accessCodes.role })
          .from(schema.accessCodes)
          .innerJoin(schema.albums, eq(schema.albums.id, schema.accessCodes.albumId))
          .where(eq(schema.accessCodes.hash, codeHash(code)))
          .limit(1)
      : [];

    if (!row) {
      await recordAttempt(ip, device, false);
      return { status: 'wrong' };
    }
    await recordAttempt(ip, device, true);
    const { album } = row;
    const now = new Date();
    if (album.status === 'closed' || album.expiresAt <= now) {
      const closed = album.status === 'closed' && album.expiresAt > now ? album.updatedAt : album.expiresAt;
      return { status: 'expired', closedOn: closed.toISOString() };
    }
    if (album.status !== 'live') return { status: 'preparing' };

    const role = (row.role === 'guest' ? 'guest' : 'client') as Role;
    await startSession(album.id, album.codeVersion, role, album.expiresAt);
    await logEvent(album.id, 'unlock', [role === 'guest' ? 'Guest code' : '', await describeVisitor()].filter(Boolean).join(', '));

    let cover: string | null = null;
    if (album.coverPhotoId) {
      const [p] = await db.select().from(schema.photos).where(eq(schema.photos.id, album.coverPhotoId));
      if (p?.previewVersion) cover = previewUrl(p.id, 'lg', p.previewVersion);
    }
    return {
      status: 'ok',
      reveal: { name: album.name, place: album.place, date: album.eventDate, count: album.photoCount, cover },
    };
  } catch (e) {
    console.error('[unlock]', e);
    return { status: 'error' };
  }
}
