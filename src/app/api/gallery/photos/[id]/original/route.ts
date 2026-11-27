import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { currentGallery } from '@/lib/session';
import { getDrive } from '@/lib/drive';
import { logEvent } from '@/lib/albums';
import { describeVisitor } from '@/lib/request';
import { attachment, nodeToWeb } from '@/lib/http';

export const maxDuration = 300;

/** One untouched original, streamed from Drive through the server. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await currentGallery();
  if (!g || g.role !== 'client') return new Response('Unauthorized', { status: 401 });
  const db = await getDb();
  const [p] = await db
    .select()
    .from(schema.photos)
    .where(and(eq(schema.photos.id, id), eq(schema.photos.albumId, g.album.id)))
    .limit(1);
  if (!p) return new Response('Not found', { status: 404 });

  const stream = await getDrive().openOriginal(p.driveFileId);
  await logEvent(g.album.id, 'download', [p.name, `${(p.sizeBytes / 1024 ** 2).toFixed(1)} MB`, await describeVisitor()].join(', '));
  const headers: Record<string, string> = {
    'Content-Type': p.mime,
    'Content-Disposition': attachment(p.name),
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
  };
  if (p.sizeBytes > 0) headers['Content-Length'] = String(p.sizeBytes);
  return new Response(nodeToWeb(stream), { headers });
}
