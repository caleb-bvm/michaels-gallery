import 'server-only';
import path from 'node:path';

function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const isProd = process.env.NODE_ENV === 'production';

function secret(): string {
  const s = str('APP_SECRET');
  if (s.length >= 32) return s;
  if (isProd && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('APP_SECRET must be set to a random string of at least 32 characters.');
  }
  return 'dev-only-secret-do-not-use-in-production-0000';
}

export const env = {
  isProd,
  siteUrl: str('SITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  get secret() {
    return secret();
  },
  databaseUrl: str('DATABASE_URL'),
  dataDir: path.resolve(str('DATA_DIR', '.data')),
  adminEmails: str('ADMIN_EMAILS')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: str('GOOGLE_CLIENT_ID'),
  googleClientSecret: str('GOOGLE_CLIENT_SECRET'),
  adminPassword: str('ADMIN_PASSWORD'),
  driveMode: str('DRIVE_MODE', 'mock') as 'mock' | 'google',
  mockDriveDir: path.resolve(str('MOCK_DRIVE_DIR', '.data/mock-drive')),
  driveRootFolderId: str('DRIVE_ROOT_FOLDER_ID'),
  serviceAccountJson: str('GOOGLE_SERVICE_ACCOUNT_JSON'),
  storageMode: str('STORAGE_MODE', 'local') as 'local',
  localStorageDir: path.resolve(str('LOCAL_STORAGE_DIR', '.data/storage')),
};
