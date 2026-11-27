import 'server-only';
import { headers } from 'next/headers';

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-real-ip') ??
    h.get('cf-connecting-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/** "San Salvador, phone" style detail for the activity log (no IPs stored). */
export async function describeVisitor(): Promise<string> {
  const h = await headers();
  const city = h.get('x-vercel-ip-city') ?? h.get('cf-ipcity');
  const country = h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry');
  const ua = h.get('user-agent') ?? '';
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'computer';
  const place = city ? decodeURIComponent(city) : country ?? '';
  return [place, device].filter(Boolean).join(', ');
}
