import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { authMode } from '@/lib/admin';

export async function GET() {
  if (authMode() !== 'google') return new Response('Google sign-in is not configured', { status: 404 });
  const state = crypto.randomBytes(16).toString('base64url');
  (await cookies()).set('mg_oauth', state, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', maxAge: 600 });
  const q = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${env.siteUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, 302);
}
