import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin';
import { albumCodes, albumEvents, eventCounts, getAlbum, getAlbumPhotos } from '@/lib/albums';
import { previewUrl } from '@/lib/session';
import { env } from '@/lib/env';
import { AlbumDetail } from '@/components/studio/AlbumDetail';

export const metadata = { title: 'Album' };

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const [codes, { photos, chapters, favourites }, events, counts] = await Promise.all([
    albumCodes(id),
    getAlbumPhotos(id),
    albumEvents(id),
    eventCounts(id),
  ]);
  const ready = photos.filter((p) => p.previewVersion > 0);
  const thumbs = Object.fromEntries(ready.map((p) => [p.id, previewUrl(p.id, 'sm', p.previewVersion)]));
  const cover = ready.find((p) => p.id === album.coverPhotoId);

  return (
    <AlbumDetail
      siteUrl={env.siteUrl}
      album={{
        id: album.id,
        name: album.name,
        eventType: album.eventType,
        eventDate: album.eventDate,
        place: album.place,
        status: album.status,
        expiresAt: album.expiresAt.toISOString(),
        allowZip: album.allowZip,
        emailLang: album.emailLang,
        photoCount: album.photoCount,
        processed: album.processedCount,
        publishError: album.publishError,
        driveFolderName: album.driveFolderName,
        coverPhotoId: album.coverPhotoId,
        cover: cover ? previewUrl(cover.id, 'lg', cover.previewVersion) : null,
      }}
      code={codes.client ?? ''}
      guestCode={codes.guest}
      counts={{ unlocks: counts.unlock ?? 0, zips: counts.zip ?? 0, singles: counts.download ?? 0 }}
      photos={ready.map((p) => ({ id: p.id, name: p.name, thumb: thumbs[p.id], chapter: chapters.find((c) => c.id === p.chapterId)?.name ?? '' }))}
      favourites={favourites}
      events={events.map((e) => ({ id: e.id, type: e.type, detail: e.detail, at: e.createdAt.toISOString() }))}
    />
  );
}
