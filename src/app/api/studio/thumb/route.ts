import { getAdmin } from '@/lib/admin';
import { getDrive } from '@/lib/drive';

/** Drive thumbnails for the Studio's cover picker (admin only). */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('Bad request', { status: 400 });
  const buf = await getDrive().thumbnail(id).catch(() => null);
  if (!buf) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } });
}
