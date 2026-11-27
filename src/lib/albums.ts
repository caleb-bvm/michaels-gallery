import 'server-only';
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getDrive, type FolderScan } from '@/lib/drive';
import { getStore, previewKey } from '@/lib/storage';
import { makePreviews, streamToBuffer } from '@/lib/images';
import { decrypt, encrypt, hmac, randomId } from '@/lib/crypto';
import { isValidCodeFormat, normalizeCode } from '@/lib/codes';

export type AlbumRow = typeof schema.albums.$inferSelect;
export type PhotoRow = typeof schema.photos.$inferSelect;

export const codeHash = (code: string) => hmac('access-code', normalizeCode(code));

export const EVENT_TYPES = ['wedding', 'xv', 'portrait', 'family', 'commercial', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export async function logEvent(albumId: string, type: string, detail = '') {
  const db = await getDb();
  await db.insert(schema.events).values({ albumId, type, detail: detail.slice(0, 300) });
}

/* ---- codes ------------------------------------------------------------- */

/** Is this code already used by another album (client or guest code)? */
export async function codeOwner(code: string): Promise<{ albumId: string; albumName: string } | null> {
  const db = await getDb();
  const rows = await db
    .select({ albumId: schema.albums.id, albumName: schema.albums.name })
    .from(schema.accessCodes)
    .innerJoin(schema.albums, eq(schema.albums.id, schema.accessCodes.albumId))
    .where(eq(schema.accessCodes.hash, codeHash(code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function albumCodes(albumId: string): Promise<{ client: string | null; guest: string | null }> {
  const db = await getDb();
  const rows = await db.select().from(schema.accessCodes).where(eq(schema.accessCodes.albumId, albumId));
  const pick = (role: string) => {
    const r = rows.find((x) => x.role === role);
    return r ? decrypt(r.codeEnc) : null;
  };
  return { client: pick('client'), guest: pick('guest') };
}

class CodeError extends Error {}
export { CodeError };

async function assertUsable(code: string, exceptAlbumId?: string) {
  if (!isValidCodeFormat(code)) throw new CodeError('The code must be exactly 6 letters or numbers.');
  const owner = await codeOwner(code);
  if (owner && owner.albumId !== exceptAlbumId) throw new CodeError(`Already used by ${owner.albumName}. Pick another.`);
}

/** Replace an album's code for a role. Bumps the version so old sessions end. */
export async function setCode(albumId: string, role: 'client' | 'guest', rawCode: string | null) {
  const db = await getDb();
  const code = rawCode ? normalizeCode(rawCode) : null;
  if (code) await assertUsable(code, albumId);
  if (code) {
    const other = await albumCodes(albumId);
    if ((role === 'client' && other.guest === code) || (role === 'guest' && other.client === code)) {
      throw new CodeError('The guest code must be different from the client code.');
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.accessCodes)
      .where(and(eq(schema.accessCodes.albumId, albumId), eq(schema.accessCodes.role, role)));
    if (code) await tx.insert(schema.accessCodes).values({ hash: codeHash(code), albumId, role, codeEnc: encrypt(code) });
    await tx
      .update(schema.albums)
      .set({ codeVersion: sql`${schema.albums.codeVersion} + 1`, updatedAt: new Date() })
      .where(eq(schema.albums.id, albumId));
  });
}

/* ---- create & publish -------------------------------------------------- */

export interface NewAlbumInput {
  name: string;
  eventType: EventType;
  eventDate: string | null;
  place: string;
  driveFolderId: string;
  coverDriveFileId: string | null;
  code: string;
  guestCode: string | null;
  days: number;
  allowZip: boolean;
  reminder: boolean;
  emailLang: 'es' | 'en';
}

function photoRows(albumId: string, scan: FolderScan, chapterIds: Map<string, string>) {
  let sort = 0;
  const groups = [
    { chapterId: null as string | null, images: scan.looseImages },
    ...scan.chapters.map((c) => ({ chapterId: chapterIds.get(c.driveFolderId)!, images: c.images })),
  ];
  return groups.flatMap((g) =>
    g.images.map((img) => ({
      id: randomId(9),
      albumId,
      chapterId: g.chapterId,
      driveFileId: img.id,
      name: img.name,
      mime: img.mime,
      sizeBytes: img.size,
      md5: img.md5,
      sort: sort++,
    })),
  );
}

export async function createAlbum(input: NewAlbumInput): Promise<string> {
  const code = normalizeCode(input.code);
  await assertUsable(code);
  const guest = input.guestCode ? normalizeCode(input.guestCode) : null;
  if (guest) {
    await assertUsable(guest);
    if (guest === code) throw new CodeError('The guest code must be different from the client code.');
  }
  const scan = await getDrive().scanFolder(input.driveFolderId);
  if (!scan.photoCount) throw new Error('That Drive folder has no photos yet.');

  const db = await getDb();
  const id = randomId(9);
  const chapterIds = new Map(scan.chapters.map((c) => [c.driveFolderId, randomId(9)]));
  const rows = photoRows(id, scan, chapterIds);
  const cover = rows.find((r) => r.driveFileId === input.coverDriveFileId) ?? rows[0];

  await db.transaction(async (tx) => {
    await tx.insert(schema.albums).values({
      id,
      name: input.name.trim().slice(0, 60),
      eventType: input.eventType,
      eventDate: input.eventDate || null,
      place: input.place.trim().slice(0, 80),
      driveFolderId: input.driveFolderId,
      driveFolderName: scan.folder.name,
      coverPhotoId: cover.id,
      status: 'processing',
      expiresAt: new Date(Date.now() + input.days * 864e5),
      allowZip: input.allowZip,
      reminder: input.reminder,
      emailLang: input.emailLang,
      photoCount: rows.length,
    });
    await tx.insert(schema.accessCodes).values({ hash: codeHash(code), albumId: id, role: 'client', codeEnc: encrypt(code) });
    if (guest) await tx.insert(schema.accessCodes).values({ hash: codeHash(guest), albumId: id, role: 'guest', codeEnc: encrypt(guest) });
    if (scan.chapters.length) {
      await tx.insert(schema.chapters).values(
        scan.chapters.map((c) => ({ id: chapterIds.get(c.driveFolderId)!, albumId: id, name: c.name, sort: c.sort, driveFolderId: c.driveFolderId })),
      );
    }
    for (let i = 0; i < rows.length; i += 500) await tx.insert(schema.photos).values(rows.slice(i, i + 500));
  });
  return id;
}

/* ---- the preview job --------------------------------------------------- */

const running = new Set<string>();

/**
 * Make previews for every photo that has none, or whose original changed in
 * Drive (md5 differs). Safe to run again: it resumes where it stopped.
 */
export async function processAlbum(albumId: string): Promise<void> {
  if (running.has(albumId)) return;
  running.add(albumId);
  const db = await getDb();
  try {
    const todo = await db
      .select()
      .from(schema.photos)
      .where(
        and(
          eq(schema.photos.albumId, albumId),
          or(isNull(schema.photos.previewMd5), ne(schema.photos.previewMd5, sql`coalesce(${schema.photos.md5}, '')`)),
        ),
      )
      .orderBy(asc(schema.photos.sort));

    const drive = getDrive();
    const store = getStore();
    let failed = 0;
    const work = async (p: PhotoRow) => {
      try {
        const original = await streamToBuffer(await drive.openOriginal(p.driveFileId));
        const pv = await makePreviews(original);
        const version = p.previewVersion + 1;
        await store.put(previewKey(albumId, p.id, 'lg', version), pv.lg, 'image/webp');
        await store.put(previewKey(albumId, p.id, 'sm', version), pv.sm, 'image/webp');
        await db
          .update(schema.photos)
          .set({ width: pv.width, height: pv.height, previewMd5: p.md5 ?? '', previewVersion: version, sizeBytes: p.sizeBytes || original.length })
          .where(eq(schema.photos.id, p.id));
      } catch (e) {
        failed++;
        console.error(`[publish] ${albumId}/${p.name}:`, e);
      }
      await db
        .update(schema.albums)
        .set({ processedCount: sql`least(${schema.albums.processedCount} + 1, ${schema.albums.photoCount})` })
        .where(eq(schema.albums.id, albumId));
    };

    const queue = [...todo];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        for (let p = queue.shift(); p; p = queue.shift()) await work(p);
      }),
    );

    const [album] = await db.select().from(schema.albums).where(eq(schema.albums.id, albumId));
    if (!album) return;
    const wasProcessing = album.status === 'processing' || album.status === 'error';
    await db
      .update(schema.albums)
      .set({
        status: failed ? 'error' : wasProcessing ? 'live' : album.status,
        publishError: failed ? `${failed} photo(s) could not be processed. Use "Sync from Drive" to retry.` : null,
        processedCount: album.photoCount,
        publishedAt: album.publishedAt ?? (failed ? null : new Date()),
        updatedAt: new Date(),
      })
      .where(eq(schema.albums.id, albumId));
    if (!failed && wasProcessing && !album.publishedAt) await logEvent(albumId, 'published', `${album.photoCount} photos, previews ready`);
  } finally {
    running.delete(albumId);
  }
}

/** Re-read the Drive folder: add new photos, drop deleted ones, refresh edited ones. */
export async function syncAlbum(albumId: string): Promise<{ added: number; removed: number; changed: number }> {
  const db = await getDb();
  const [album] = await db.select().from(schema.albums).where(eq(schema.albums.id, albumId));
  if (!album) throw new Error('Album not found');
  const scan = await getDrive().scanFolder(album.driveFolderId);
  const existing = await db.select().from(schema.photos).where(eq(schema.photos.albumId, albumId));
  const chapters = await db.select().from(schema.chapters).where(eq(schema.chapters.albumId, albumId));

  const chapterIds = new Map(chapters.map((c) => [c.driveFolderId, c.id]));
  const newChapters = scan.chapters.filter((c) => !chapterIds.has(c.driveFolderId));
  for (const c of newChapters) chapterIds.set(c.driveFolderId, randomId(9));

  const byFile = new Map(existing.map((p) => [p.driveFileId, p]));
  const fresh = photoRows(albumId, scan, chapterIds);
  const seen = new Set(fresh.map((f) => f.driveFileId));
  const added = fresh.filter((f) => !byFile.has(f.driveFileId));
  const removed = existing.filter((p) => !seen.has(p.driveFileId));
  let changed = 0;

  await db.transaction(async (tx) => {
    if (newChapters.length) {
      await tx.insert(schema.chapters).values(
        newChapters.map((c) => ({ id: chapterIds.get(c.driveFolderId)!, albumId, name: c.name, sort: c.sort, driveFolderId: c.driveFolderId })),
      );
    }
    for (const c of scan.chapters) {
      await tx.update(schema.chapters).set({ name: c.name, sort: c.sort }).where(eq(schema.chapters.id, chapterIds.get(c.driveFolderId)!));
    }
    for (const f of fresh) {
      const old = byFile.get(f.driveFileId);
      if (!old) continue;
      if (old.md5 !== f.md5) changed++;
      await tx
        .update(schema.photos)
        .set({ sort: f.sort, name: f.name, chapterId: f.chapterId, md5: f.md5, sizeBytes: f.sizeBytes })
        .where(eq(schema.photos.id, old.id));
    }
    if (added.length) await tx.insert(schema.photos).values(added);
    if (removed.length) await tx.delete(schema.photos).where(inArray(schema.photos.id, removed.map((r) => r.id)));
    const total = fresh.length;
    const cover = album.coverPhotoId && !removed.some((r) => r.id === album.coverPhotoId) ? album.coverPhotoId : (existing.find((p) => seen.has(p.driveFileId))?.id ?? added[0]?.id ?? null);
    await tx
      .update(schema.albums)
      .set({
        photoCount: total,
        processedCount: total - added.length - changed,
        coverPhotoId: cover,
        driveFolderName: scan.folder.name,
        status: album.status === 'error' ? 'processing' : album.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.albums.id, albumId));
  });
  await logEvent(albumId, 'synced', `${added.length} added, ${removed.length} removed, ${changed} updated`);
  return { added: added.length, removed: removed.length, changed };
}

/* ---- lifecycle --------------------------------------------------------- */

export async function extendAlbum(albumId: string, days: number) {
  const db = await getDb();
  const [a] = await db.select().from(schema.albums).where(eq(schema.albums.id, albumId));
  if (!a) throw new Error('Album not found');
  const reopen = a.status === 'closed' || a.expiresAt < new Date();
  const base = reopen ? Date.now() : a.expiresAt.getTime();
  const expiresAt = new Date(base + days * 864e5);
  await db
    .update(schema.albums)
    .set({ expiresAt, status: a.status === 'closed' ? 'live' : a.status, updatedAt: new Date() })
    .where(eq(schema.albums.id, albumId));
  await logEvent(albumId, reopen ? 'reopened' : 'extended', `Open until ${expiresAt.toISOString().slice(0, 10)}`);
}

export async function closeAlbum(albumId: string) {
  const db = await getDb();
  await db
    .update(schema.albums)
    .set({ status: 'closed', codeVersion: sql`${schema.albums.codeVersion} + 1`, updatedAt: new Date() })
    .where(eq(schema.albums.id, albumId));
  await logEvent(albumId, 'closed', 'Access ended by Michael');
}

export async function deleteAlbum(albumId: string) {
  const db = await getDb();
  await db.delete(schema.albums).where(eq(schema.albums.id, albumId));
  await getStore().removePrefix(`albums/${albumId}`);
}

export async function updateAlbumDetails(
  albumId: string,
  data: { name: string; eventType: EventType; eventDate: string | null; place: string; coverPhotoId: string | null; allowZip: boolean; emailLang: 'es' | 'en' },
) {
  const db = await getDb();
  await db
    .update(schema.albums)
    .set({ ...data, name: data.name.trim().slice(0, 60), place: data.place.trim().slice(0, 80), updatedAt: new Date() })
    .where(eq(schema.albums.id, albumId));
}

/* ---- reads ------------------------------------------------------------- */

export async function listAlbums() {
  const db = await getDb();
  const rows = await db.select().from(schema.albums).orderBy(desc(schema.albums.createdAt));
  const stats = await db
    .select({ albumId: schema.events.albumId, type: schema.events.type, n: sql<number>`count(*)::int` })
    .from(schema.events)
    .groupBy(schema.events.albumId, schema.events.type);
  const codes = await db.select().from(schema.accessCodes).where(eq(schema.accessCodes.role, 'client'));
  return rows.map((a) => {
    const s = (t: string) => stats.find((x) => x.albumId === a.id && x.type === t)?.n ?? 0;
    const c = codes.find((x) => x.albumId === a.id);
    return { ...a, code: c ? decrypt(c.codeEnc) : '', unlocks: s('unlock'), downloads: s('download') + s('zip') };
  });
}

export async function getAlbumPhotos(albumId: string) {
  const db = await getDb();
  const [chapters, photos, favs] = await Promise.all([
    db.select().from(schema.chapters).where(eq(schema.chapters.albumId, albumId)).orderBy(asc(schema.chapters.sort)),
    db.select().from(schema.photos).where(eq(schema.photos.albumId, albumId)).orderBy(asc(schema.photos.sort)),
    db.select().from(schema.favourites).where(eq(schema.favourites.albumId, albumId)).orderBy(asc(schema.favourites.createdAt)),
  ]);
  return { chapters, photos, favourites: favs.map((f) => f.photoId) };
}

export async function getAlbum(albumId: string) {
  const db = await getDb();
  const [a] = await db.select().from(schema.albums).where(eq(schema.albums.id, albumId));
  return a ?? null;
}

export async function albumEvents(albumId: string, limit = 60) {
  const db = await getDb();
  return db.select().from(schema.events).where(eq(schema.events.albumId, albumId)).orderBy(desc(schema.events.createdAt)).limit(limit);
}

export async function eventCounts(albumId: string) {
  const db = await getDb();
  const rows = await db
    .select({ type: schema.events.type, n: sql<number>`count(*)::int` })
    .from(schema.events)
    .where(eq(schema.events.albumId, albumId))
    .groupBy(schema.events.type);
  return Object.fromEntries(rows.map((r) => [r.type, r.n])) as Record<string, number>;
}
