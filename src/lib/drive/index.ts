import 'server-only';
import { env } from '@/lib/env';
import type { DriveSource } from './types';
import { MockDrive } from './mock';
import { GoogleDrive } from './google';

let instance: DriveSource | null = null;

export function getDrive(): DriveSource {
  if (!instance) {
    instance =
      env.driveMode === 'google'
        ? new GoogleDrive(env.driveRootFolderId, env.serviceAccountJson)
        : new MockDrive(env.mockDriveDir);
  }
  return instance;
}

export type { DriveSource, FolderScan, DriveFolder, DriveImage } from './types';
