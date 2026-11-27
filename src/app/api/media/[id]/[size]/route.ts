import { getStore, mediaKey } from '@/lib/storage';

/** Public site images uploaded in the Studio (hero slides, selected work, portrait). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; size: string }> }) {
  const { id, size } = await params;
  if (!/^[\w-]{6,40}$/.test(id) || (size !== 'lg' && size !== 'sm')) return new Response('Not found', { status: 404 });
  const obj = await getStore().get(mediaKey(id, size));
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: { 'Content-Type': obj.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
