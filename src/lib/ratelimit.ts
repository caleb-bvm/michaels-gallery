import 'server-only';
import { and, count, eq, gt, lt, or } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { sha256 } from '@/lib/crypto';

/*
 * Code guessing is throttled: 5 failed attempts per device or IP in 15
 * minutes, plus a site-wide cap so a botnet can't sweep the code space.
 */
export const WINDOW_MS = 15 * 60 * 1000;
export const PER_CLIENT = 5;
export const SITE_WIDE = 300;

export async function isBlocked(ip: string, device: string): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - WINDOW_MS);
  const ipKey = sha256(`ip:${ip}`);
  const deviceKey = sha256(`dev:${device}`);
  const [mine] = await db
    .select({ n: count() })
    .from(schema.attempts)
    .where(
      and(
        eq(schema.attempts.ok, false),
        gt(schema.attempts.createdAt, since),
        or(eq(schema.attempts.ipKey, ipKey), eq(schema.attempts.deviceKey, deviceKey)),
      ),
    );
  if (mine.n >= PER_CLIENT) return true;
  const [all] = await db
    .select({ n: count() })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.ok, false), gt(schema.attempts.createdAt, since)));
  return all.n >= SITE_WIDE;
}

export async function recordAttempt(ip: string, device: string, ok: boolean) {
  const db = await getDb();
  await db.insert(schema.attempts).values({ ipKey: sha256(`ip:${ip}`), deviceKey: sha256(`dev:${device}`), ok });
  if (Math.random() < 0.05) {
    await db.delete(schema.attempts).where(lt(schema.attempts.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));
  }
}
