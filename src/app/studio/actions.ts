'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { requireAdmin, authMode, passwordMatches, setAdmin, clearAdmin } from '@/lib/admin';
import { getDrive } from '@/lib/drive';
import {
  closeAlbum,
  codeOwner,
  createAlbum,
  deleteAlbum,
  extendAlbum,
  getAlbum,
  logEvent,
  processAlbum,
  setCode,
  syncAlbum,
  updateAlbumDetails,
  CodeError,
  EVENT_TYPES,
  type EventType,
} from '@/lib/albums';
import { checkCodeLocally, normalizeCode } from '@/lib/codes';
import { saveContent } from '@/lib/content';
import type { Img, SiteContent } from '@/lib/content-types';
import { getDb, schema } from '@/lib/db';
import { getStore, mediaKey } from '@/lib/storage';
import { randomId } from '@/lib/crypto';
import { env } from '@/lib/env';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => {
  if (e instanceof CodeError) return { ok: false, error: e.message };
  console.error('[studio]', e);
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
};

/* ---- sign-in ----------------------------------------------------------- */

export async function passwordLogin(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  if (authMode() !== 'password') return { error: 'Password sign-in is off.' };
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(String(form.get('password') ?? ''))) return { error: 'Wrong password.' };
  await setAdmin(env.adminEmails[0] ?? 'admin');
  redirect('/studio');
}

export async function devLogin() {
  if (authMode() !== 'dev') return;
  await setAdmin('dev@localhost');
  redirect('/studio');
}

export async function logout() {
  await clearAdmin();
  redirect('/studio/login');
}

/* ---- codes ------------------------------------------------------------- */

export async function checkCode(raw: string, albumId?: string) {
  await requireAdmin();
  const code = normalizeCode(raw);
  const local = checkCodeLocally(code);
  if (local.state === 'empty' || local.state === 'short') return local;
  const owner = await codeOwner(code);
  if (owner && owner.albumId !== albumId) return { state: 'taken' as const, owner: owner.albumName };
  if (owner && owner.albumId === albumId) return { state: 'same' as const };
  return local;
}

/* ---- Drive ------------------------------------------------------------- */

export async function listFolders(): Promise<Result<{ folders: { id: string; name: string }[] }>> {
  try {
    await requireAdmin();
    return { ok: true, folders: await getDrive().listClientFolders() };
  } catch (e) {
    return fail(e);
  }
}

export async function scanFolder(id: string): Promise<
  Result<{ name: string; photoCount: number; totalBytes: number; chapters: { name: string; count: number }[]; candidates: { id: string; name: string }[] }>
> {
  try {
    await requireAdmin();
    const s = await getDrive().scanFolder(id);
    const all = [...s.looseImages, ...s.chapters.flatMap((c) => c.images)];
    return {
      ok: true,
      name: s.folder.name,
      photoCount: s.photoCount,
      totalBytes: s.totalBytes,
      chapters: s.chapters.map((c) => ({ name: c.name, count: c.images.length })),
      candidates: all.slice(0, 36).map((i) => ({ id: i.id, name: i.name })),
    };
  } catch (e) {
    return fail(e);
  }
}

/* ---- albums ------------------------------------------------------------ */

export interface PublishInput {
  name: string;
  eventType: string;
  eventDate: string;
  place: string;
  driveFolderId: string;
  coverDriveFileId: string | null;
  code: string;
  guestCode: string | null;
  days: number;
  allowZip: boolean;
  reminder: boolean;
  emailLang: string;
}

export async function publishAlbum(input: PublishInput): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    if (!input.name.trim()) return { ok: false, error: 'Write the names for the reveal.' };
    const days = [30, 60, 90, 180].includes(input.days) ? input.days : 90;
    const id = await createAlbum({
      name: input.name,
      eventType: (EVENT_TYPES as readonly string[]).includes(input.eventType) ? (input.eventType as EventType) : 'other',
      eventDate: /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ? input.eventDate : null,
      place: input.place,
      driveFolderId: input.driveFolderId,
      coverDriveFileId: input.coverDriveFileId,
      code: input.code,
      guestCode: input.guestCode || null,
      days,
      allowZip: input.allowZip,
      reminder: input.reminder,
      emailLang: input.emailLang === 'en' ? 'en' : 'es',
    });
    after(() => processAlbum(id));
    revalidatePath('/studio');
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function albumProgress(id: string) {
  await requireAdmin();
  const a = await getAlbum(id);
  if (!a) return null;
  return { status: a.status, processed: a.processedCount, total: a.photoCount, error: a.publishError };
}

export async function extend(id: string, days = 30): Promise<Result> {
  try {
    await requireAdmin();
    await extendAlbum(id, days);
    revalidatePath(`/studio/albums/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function close(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await closeAlbum(id);
    revalidatePath(`/studio/albums/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changeCode(id: string, role: 'client' | 'guest', code: string | null): Promise<Result> {
  try {
    await requireAdmin();
    if (role === 'client' && !code) return { ok: false, error: 'The client code cannot be empty.' };
    await setCode(id, role, code);
    await logEvent(id, 'code_changed', role === 'guest' ? (code ? 'Guest code set' : 'Guest code removed') : 'New client code; old sessions signed out');
    revalidatePath(`/studio/albums/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sync(id: string): Promise<Result<{ added: number; removed: number; changed: number }>> {
  try {
    await requireAdmin();
    const r = await syncAlbum(id);
    after(() => processAlbum(id));
    revalidatePath(`/studio/albums/${id}`);
    return { ok: true, ...r };
  } catch (e) {
    return fail(e);
  }
}

export async function retryProcessing(id: string): Promise<Result> {
  await requireAdmin();
  after(() => processAlbum(id));
  return { ok: true };
}

export async function saveDetails(
  id: string,
  d: { name: string; eventType: string; eventDate: string; place: string; coverPhotoId: string | null; allowZip: boolean; emailLang: string },
): Promise<Result> {
  try {
    await requireAdmin();
    if (!d.name.trim()) return { ok: false, error: 'Names cannot be empty.' };
    await updateAlbumDetails(id, {
      name: d.name,
      eventType: (EVENT_TYPES as readonly string[]).includes(d.eventType) ? (d.eventType as EventType) : 'other',
      eventDate: /^\d{4}-\d{2}-\d{2}$/.test(d.eventDate) ? d.eventDate : null,
      place: d.place,
      coverPhotoId: d.coverPhotoId,
      allowZip: d.allowZip,
      emailLang: d.emailLang === 'en' ? 'en' : 'es',
    });
    revalidatePath(`/studio/albums/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAlbum(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await deleteAlbum(id);
    revalidatePath('/studio');
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- main page --------------------------------------------------------- */

export async function saveSite(content: SiteContent): Promise<Result> {
  try {
    await requireAdmin();
    if (!content?.hero?.slides?.length) return { ok: false, error: 'Keep at least one slide.' };
    await saveContent(content);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Upload an image for the public site: resized for the web, metadata stripped. */
export async function uploadImage(form: FormData): Promise<Result<{ img: Img }>> {
  try {
    await requireAdmin();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) return { ok: false, error: 'Choose an image.' };
    if (file.size > 60 * 1024 ** 2) return { ok: false, error: 'That file is over 60 MB.' };
    const buf = Buffer.from(await file.arrayBuffer());
    const base = sharp(buf, { failOn: 'none' }).rotate();
    const lg = await base.clone().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const sm = await base.clone().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
    const id = randomId(9);
    await getStore().put(mediaKey(id, 'lg'), lg.data, 'image/webp');
    await getStore().put(mediaKey(id, 'sm'), sm, 'image/webp');
    const db = await getDb();
    await db.insert(schema.media).values({ id, width: lg.info.width, height: lg.info.height });
    return { ok: true, img: { src: `/api/media/${id}/lg`, w: lg.info.width, h: lg.info.height } };
  } catch (e) {
    return fail(e);
  }
}
