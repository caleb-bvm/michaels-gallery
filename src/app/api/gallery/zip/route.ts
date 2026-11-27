import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { currentGallery } from '@/lib/session';
import { getDrive } from '@/lib/drive';
import { logEvent } from '@/lib/albums';
import { describeVisitor } from '@/lib/request';
import { splitParts } from '@/lib/zipparts';
import { zipStream } from '@/lib/zip';
import { attachment, iterToWeb, slug } from '@/lib/http';

export const maxDuration = 800;

/**
 * Originals as a ZIP, streamed: the first bytes leave as soon as the first
 * file arrives from Drive. Big galleries come in parts of about 2 GB.
 */
export async function GET(req: Request) {
  const g = await currentGallery();
  if (!g || g.role !== 'client' || !g.album.allowZip) return new Response('Unauthorized', { status: 401 });
  const u = new URL(req.url);
  const set = u.searchParams.get('set') === 'favs' ? 'favs' : 'all';
  const part = Math.max(1, Number(u.searchParams.get('part') ?? 1) || 1);

  const db = await getDb();
  const albumId = g.album.id;
  let photos = await db
    .select()
    .from(schema.photos)
    .where(and(eq(schema.photos.albumId, albumId)))
    .orderBy(asc(schema.photos.sort));
  photos = photos.filter((p) => p.previewVersion > 0);
  if (set === 'favs') {
    const favs = new Set((await db.select().from(schema.favourites).where(eq(schema.favourites.albumId, albumId))).map((f) => f.photoId));
    photos = photos.filter((p) => favs.has(p.id));
  }
  const parts = splitParts(photos);
  const chosen = parts[part - 1];
  if (!chosen) return new Response('Not found', { status: 404 });

  const chapters = await db.select().from(schema.chapters).where(eq(schema.chapters.albumId, albumId));
  const folder = new Map(chapters.map((c) => [c.id, `${String(c.sort + 1).padStart(2, '0')} ${c.name}`.replace(/[\\/:*?"<>|]/g, '-')]));
  const used = new Set<string>();
  const drive = getDrive();
  const entries = chosen.map((p) => {
    let name = p.chapterId && folder.get(p.chapterId) ? `${folder.get(p.chapterId)}/${p.name}` : p.name;
    for (let i = 2; used.has(name); i++) name = name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    used.add(name);
    return { name, open: () => drive.openOriginal(p.driveFileId) };
  });

  await logEvent(albumId, 'zip', [`${set === 'favs' ? 'Favourites' : 'All'}, part ${part} of ${parts.length}`, `${chosen.length} photos`, await describeVisitor()].join(', '));
  const base = slug(g.album.name);
  const filename = parts.length > 1 ? `${base}${set === 'favs' ? '-favoritas' : ''}-parte-${part}-de-${parts.length}.zip` : `${base}${set === 'favs' ? '-favoritas' : ''}.zip`;
  return new Response(iterToWeb(zipStream(entries)), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachment(filename),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
