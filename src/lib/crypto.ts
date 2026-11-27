import 'server-only';
import crypto from 'node:crypto';
import { env } from '@/lib/env';

function key(purpose: string, len = 32): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', env.secret, 'michaels-gallery', purpose, len));
}

/** Deterministic keyed hash, used to look up access codes without storing them. */
export function hmac(purpose: string, value: string): string {
  return crypto.createHmac('sha256', key(purpose)).update(value).digest('base64url');
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key('code-encryption'), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(token: string): string {
  const [iv, tag, data] = token.split('.').map((p) => Buffer.from(p, 'base64url'));
  const d = crypto.createDecipheriv('aes-256-gcm', key('code-encryption'), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

/** Signed, expiring JSON token: base64url(payload).signature */
export function sign(purpose: string, payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(purpose, body)}`;
}

export function verify<T extends { exp: number }>(purpose: string, token: string | undefined): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(purpose, body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function randomId(bytes = 12): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('base64url');
}
