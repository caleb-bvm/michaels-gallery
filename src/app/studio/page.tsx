import Link from 'next/link';
import { inArray } from 'drizzle-orm';
import { requireAdminPage } from '@/lib/admin';
import { listAlbums } from '@/lib/albums';
import { getDb, schema } from '@/lib/db';
import { previewUrl } from '@/lib/session';
import { AlbumsGrid, type AlbumCard } from '@/components/studio/AlbumsGrid';

export const metadata = { title: 'Albums' };

export default async function AlbumsPage() {
  await requireAdminPage();
  const albums = await listAlbums();
  const coverIds = albums.map((a) => a.coverPhotoId).filter((x): x is string => !!x);
  const db = await getDb();
  const covers = coverIds.length ? await db.select().from(schema.photos).where(inArray(schema.photos.id, coverIds)) : [];
  const cards: AlbumCard[] = albums.map((a) => {
    const c = covers.find((p) => p.id === a.coverPhotoId);
    return {
      id: a.id,
      name: a.name,
      eventType: a.eventType,
      eventDate: a.eventDate,
      status: a.status,
      expiresAt: a.expiresAt.toISOString(),
      photoCount: a.photoCount,
      processed: a.processedCount,
      code: a.code,
      unlocks: a.unlocks,
      downloads: a.downloads,
      cover: c?.previewVersion ? previewUrl(c.id, 'sm', c.previewVersion) : null,
    };
  });
  return (
    <main className="gut">
      <div className="head">
        <div>
          <h1>Albums</h1>
          <p>Every client gallery, its code and how it&apos;s being used. Click an album to manage it.</p>
        </div>
        <Link className="pill solid" href="/studio/new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          New album
        </Link>
      </div>
      <AlbumsGrid albums={cards} />
    </main>
  );
}
