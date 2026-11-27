import { clearAdmin } from '@/lib/admin';
import { env } from '@/lib/env';

export async function POST() {
  await clearAdmin();
  return Response.redirect(`${env.siteUrl}/studio/login`, 303);
}
