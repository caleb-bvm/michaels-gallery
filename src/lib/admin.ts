import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sign, verify } from '@/lib/crypto';
import { env } from '@/lib/env';

/*
 * Studio sign-in. With a Google OAuth client configured, only the Google
 * accounts in ADMIN_EMAILS get in. Until then, ADMIN_PASSWORD works, and in
 * local development with neither set, a one-click dev sign-in is offered.
 */

const COOKIE = 'mg_admin';
const TTL = 14 * 24 * 3600 * 1000;

export type AuthMode = 'google' | 'password' | 'dev' | 'none';

export function authMode(): AuthMode {
  if (env.googleClientId && env.googleClientSecret) return 'google';
  if (env.adminPassword) return 'password';
  return env.isProd ? 'none' : 'dev';
}

export async function setAdmin(email: string) {
  (await cookies()).set(COOKIE, sign('admin', { email, exp: Date.now() + TTL }), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL / 1000,
  });
}

export async function clearAdmin() {
  (await cookies()).delete(COOKIE);
}

export async function getAdmin(): Promise<{ email: string } | null> {
  const p = verify<{ email: string; exp: number }>('admin', (await cookies()).get(COOKIE)?.value);
  if (!p) return null;
  // Sessions from another sign-in mode (e.g. dev) stop working once Google is configured
  if (authMode() === 'google' && !env.adminEmails.includes(p.email.toLowerCase())) return null;
  return { email: p.email };
}

/** For Studio pages: send strangers to the sign-in page. */
export async function requireAdminPage() {
  const a = await getAdmin();
  if (!a) redirect('/studio/login');
  return a;
}

/** For server actions and API routes. */
export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw new Error('Not signed in');
  return a;
}

export function passwordMatches(input: string) {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(env.adminPassword).digest();
  return env.adminPassword.length > 0 && crypto.timingSafeEqual(a, b);
}
