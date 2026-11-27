import 'server-only';
import type { Readable } from 'node:stream';
import { drive as driveApi, type drive_v3 } from '@googleapis/drive';
import { GoogleAuth } from 'google-auth-library';
import type { DriveSource, DriveFolder, DriveImage, FolderScan } from './types';
import { IMAGE_MIME } from './types';
import { naturalCompare, sortChapters } from './names';

/*
 * Google Drive through a service account. Michael shares his top-level
 * "Clientes" folder with the service account's email as Viewer; the site can
 * read that folder and nothing else. Nothing here is ever sent to a browser.
 */

const FOLDER = 'application/vnd.google-apps.folder';

function parseKey(raw: string) {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(text) as { client_email: string; private_key: string };
}

export class GoogleDrive implements DriveSource {
  private api: drive_v3.Drive;
  private auth: GoogleAuth;

  constructor(
    private rootFolderId: string,
    serviceAccountJson: string,
  ) {
    if (!rootFolderId || !serviceAccountJson) {
      throw new Error('DRIVE_ROOT_FOLDER_ID and GOOGLE_SERVICE_ACCOUNT_JSON are required when DRIVE_MODE=google');
    }
    const credentials = parseKey(serviceAccountJson);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
    this.auth = auth;
    this.api = driveApi({ version: 'v3', auth });
  }

  private async children(parentId: string): Promise<drive_v3.Schema$File[]> {
    const out: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.withRetry(() =>
        this.api.files.list({
          q: `'${parentId.replace(/'/g, "\\'")}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size, md5Checksum)',
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        }),
      );
      out.push(...(res.data.files ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return out;
  }

  /** Back off on rate limits (403 userRateLimitExceeded / 429). */
  private async withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        return await fn();
      } catch (e) {
        const status = (e as { code?: number; status?: number }).code ?? (e as { status?: number }).status;
        if (i >= tries - 1 || !(status === 429 || status === 403 || (status && status >= 500))) throw e;
        await new Promise((r) => setTimeout(r, 2 ** i * 500 + Math.random() * 300));
      }
    }
  }

  async listClientFolders(): Promise<DriveFolder[]> {
    const files = await this.children(this.rootFolderId);
    return files
      .filter((f) => f.mimeType === FOLDER)
      .map((f) => ({ id: f.id!, name: f.name ?? '' }))
      .sort((a, b) => naturalCompare(b.name, a.name));
  }

  private toImages(files: drive_v3.Schema$File[]): DriveImage[] {
    return files
      .filter((f) => f.mimeType && IMAGE_MIME.has(f.mimeType))
      .map((f) => ({ id: f.id!, name: f.name ?? f.id!, mime: f.mimeType!, size: Number(f.size ?? 0), md5: f.md5Checksum ?? null }))
      .sort((a, b) => naturalCompare(a.name, b.name));
  }

  async scanFolder(folderId: string): Promise<FolderScan> {
    const meta = await this.withRetry(() =>
      this.api.files.get({ fileId: folderId, fields: 'id, name, parents', supportsAllDrives: true }),
    );
    const files = await this.children(folderId);
    const looseImages = this.toImages(files);
    const subs = sortChapters(files.filter((f) => f.mimeType === FOLDER).map((f) => ({ rawName: f.name ?? '', id: f.id! })));
    const chapters = [];
    for (const s of subs) {
      chapters.push({ driveFolderId: s.id, name: s.name, sort: s.sort, images: this.toImages(await this.children(s.id)) });
    }
    const all = [...looseImages, ...chapters.flatMap((c) => c.images)];
    return {
      folder: { id: folderId, name: meta.data.name ?? '' },
      looseImages,
      chapters: chapters.filter((c) => c.images.length),
      photoCount: all.length,
      totalBytes: all.reduce((s, i) => s + i.size, 0),
    };
  }

  async openOriginal(fileId: string): Promise<Readable> {
    const res = await this.withRetry(() =>
      this.api.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' }),
    );
    return res.data as unknown as Readable;
  }

  async thumbnail(fileId: string): Promise<Buffer | null> {
    const meta = await this.withRetry(() => this.api.files.get({ fileId, fields: 'thumbnailLink', supportsAllDrives: true }));
    const link = meta.data.thumbnailLink;
    if (!link) return null;
    const token = await this.auth.getAccessToken();
    const res = await fetch(link.replace(/=s\d+$/, '=s400'), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
}
