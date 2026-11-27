import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { currentGallery, previewUrl } from '@/lib/session';
import { getAlbumPhotos } from '@/lib/albums';
import type { GalleryData } from '@/lib/gallery-types';
import { GalleryView } from '@/components/site/GalleryView';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('galleryTitle'), robots: { index: false, follow: false } };
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const g = await currentGallery();
  if (!g) return redirect({ href: '/access', locale });

  const { album, role } = g;
  const { chapters, photos, favourites } = await getAlbumPhotos(album.id);
  const ready = photos.filter((p) => p.previewVersion > 0);
  const now = Date.now();
  const data: GalleryData = {
    name: album.name,
    eventType: album.eventType,
    eventDate: album.eventDate,
    place: album.place,
    expiresAt: album.expiresAt.toISOString(),
    role,
    allowZip: album.allowZip,
    chapters: chapters.filter((c) => ready.some((p) => p.chapterId === c.id)).map((c) => ({ id: c.id, name: c.name })),
    photos: ready.map((p) => ({
      id: p.id,
      name: p.name,
      chapterId: p.chapterId,
      w: p.width ?? 3,
      h: p.height ?? 2,
      size: p.sizeBytes,
      sm: previewUrl(p.id, 'sm', p.previewVersion, now),
      lg: previewUrl(p.id, 'lg', p.previewVersion, now),
    })),
    favourites: favourites.filter((id) => ready.some((p) => p.id === id)),
  };
  return <GalleryView data={data} />;
}
