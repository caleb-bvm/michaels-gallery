import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { currentGallery } from '@/lib/session';
import { logEvent } from '@/lib/albums';

export async function POST(req: Request) {
  const g = await currentGallery();
  if (!g) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { photoId?: unknown; on?: unknown } | null;
  if (!body || typeof body.photoId !== 'string' || typeof body.on !== 'boolean') return Response.json({ error: 'bad request' }, { status: 400 });

  const db = await getDb();
  const [photo] = await db
    .select({ id: schema.photos.id, name: schema.photos.name })
    .from(schema.photos)
    .where(and(eq(schema.photos.id, body.photoId), eq(schema.photos.albumId, g.album.id)))
    .limit(1);
  if (!photo) return Response.json({ error: 'not found' }, { status: 404 });

  if (body.on) {
    await db.insert(schema.favourites).values({ albumId: g.album.id, photoId: photo.id }).onConflictDoNothing();
  } else {
    await db.delete(schema.favourites).where(and(eq(schema.favourites.albumId, g.album.id), eq(schema.favourites.photoId, photo.id)));
  }
  await logEvent(g.album.id, body.on ? 'favourite' : 'unfavourite', photo.name);
  return Response.json({ ok: true });
}
