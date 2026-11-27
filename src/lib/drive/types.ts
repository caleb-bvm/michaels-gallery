import type { Readable } from 'node:stream';

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveImage {
  id: string;
  name: string;
  mime: string;
  size: number;
  md5: string | null;
}

export interface ScannedChapter {
  driveFolderId: string;
  /** Display name, with any numeric ordering prefix removed */
  name: string;
  sort: number;
  images: DriveImage[];
}

export interface FolderScan {
  folder: DriveFolder;
  /** Images directly inside the client folder (no chapter) */
  looseImages: DriveImage[];
  chapters: ScannedChapter[];
  photoCount: number;
  totalBytes: number;
}

export interface DriveSource {
  /** Client folders inside the top-level "Clientes" folder */
  listClientFolders(): Promise<DriveFolder[]>;
  /** One client folder: its images, and subfolders as chapters */
  scanFolder(folderId: string): Promise<FolderScan>;
  /** Stream an original file, untouched */
  openOriginal(fileId: string): Promise<Readable>;
  /** A small JPEG/WebP thumbnail, for picking a cover in the Studio */
  thumbnail(fileId: string): Promise<Buffer | null>;
}

export const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/avif']);
