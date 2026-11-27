import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getStore, previewKey } from '@/lib/storage';
import { checkPreviewSig } from '@/lib/session';

/** Signed, expiring preview images. No Drive URL or file ID ever reaches the browser. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; size: string }> }) {
  const { id, size } = await params;
  const u = new URL(req.url);
  const v = u.searchParams.get('v') ?? '';
  const e = u.searchParams.get('e') ?? '';
  const s = u.searchParams.get('s') ?? '';
  if ((size !== 'sm' && size !== 'lg') || !checkPreviewSig(id, size, v, e, s)) return new Response('Not found', { status: 404 });

  const db = await getDb();
  const [p] = await db
    .select({ albumId: schema.photos.albumId })
    .from(schema.photos)
    .where(eq(schema.photos.id, id))
    .limit(1);
  if (!p) return new Response('Not found', { status: 404 });
  const obj = await getStore().get(previewKey(p.albumId, id, size, Number(v)));
  if (!obj) return new Response('Not found', { status: 404 });

  const maxAge = Math.max(0, Math.floor((Number(e) - Date.now()) / 1000));
  return new Response(new Uint8Array(obj.body), {
    headers: {
      'Content-Type': obj.contentType,
      'Cache-Control': `private, max-age=${maxAge}, immutable`,
      'X-Robots-Tag': 'noindex',
    },
  });
}
