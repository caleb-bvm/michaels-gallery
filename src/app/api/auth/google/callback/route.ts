import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { authMode, setAdmin } from '@/lib/admin';

export async function GET(req: Request) {
  if (authMode() !== 'google') return new Response('Not found', { status: 404 });
  const u = new URL(req.url);
  const jar = await cookies();
  const state = jar.get('mg_oauth')?.value;
  jar.delete('mg_oauth');
  const code = u.searchParams.get('code');
  if (!code || !state || u.searchParams.get('state') !== state) return Response.redirect(`${env.siteUrl}/studio/login?e=state`, 302);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: `${env.siteUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return Response.redirect(`${env.siteUrl}/studio/login?e=google`, 302);
  const { id_token } = (await res.json()) as { id_token?: string };
  // The ID token comes straight from Google's token endpoint over TLS, so its claims can be read directly.
  const claims = id_token ? JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString('utf8')) : {};
  const email = String(claims.email ?? '').toLowerCase();
  const okAud = claims.aud === env.googleClientId && ['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss);
  if (!okAud || claims.email_verified !== true || !env.adminEmails.includes(email)) {
    return Response.redirect(`${env.siteUrl}/studio/login?e=denied`, 302);
  }
  await setAdmin(email);
  return Response.redirect(`${env.siteUrl}/studio`, 302);
}
