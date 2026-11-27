import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  jsonb,
  serial,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

/** One client gallery. Photos live in Drive; previews in the preview store. */
export const albums = pgTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  eventType: text('event_type').notNull().default('other'),
  eventDate: date('event_date'),
  place: text('place').notNull().default(''),
  driveFolderId: text('drive_folder_id').notNull(),
  driveFolderName: text('drive_folder_name').notNull().default(''),
  coverPhotoId: text('cover_photo_id'),
  /** processing | live | error | closed */
  status: text('status').notNull().default('processing'),
  /** Bumped whenever the code changes: signs out every device on the old one. */
  codeVersion: integer('code_version').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  allowZip: boolean('allow_zip').notNull().default(true),
  reminder: boolean('reminder').notNull().default(true),
  emailLang: text('email_lang').notNull().default('es'),
  photoCount: integer('photo_count').notNull().default(0),
  processedCount: integer('processed_count').notNull().default(0),
  publishError: text('publish_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Access codes. The primary key is an HMAC of the normalised code, so lookups
 * and global uniqueness work without storing the code in plain text. The code
 * itself is kept encrypted only so the Studio can show and copy it.
 */
export const accessCodes = pgTable(
  'access_codes',
  {
    hash: text('hash').primaryKey(),
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    /** client (full access) | guest (view only) */
    role: text('role').notNull().default('client'),
    codeEnc: text('code_enc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('access_codes_album_idx').on(t.albumId)],
);

export const chapters = pgTable(
  'chapters',
  {
    id: text('id').primaryKey(),
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sort: integer('sort').notNull().default(0),
    driveFolderId: text('drive_folder_id').notNull(),
  },
  (t) => [index('chapters_album_idx').on(t.albumId)],
);

export const photos = pgTable(
  'photos',
  {
    id: text('id').primaryKey(),
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id'),
    driveFileId: text('drive_file_id').notNull(),
    name: text('name').notNull(),
    mime: text('mime').notNull().default('image/jpeg'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull().default(0),
    md5: text('md5'),
    width: integer('width'),
    height: integer('height'),
    sort: integer('sort').notNull().default(0),
    /** md5 of the original the current previews were made from; null = not processed yet */
    previewMd5: text('preview_md5'),
    previewVersion: integer('preview_version').notNull().default(0),
  },
  (t) => [index('photos_album_idx').on(t.albumId)],
);

export const favourites = pgTable(
  'favourites',
  {
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    photoId: text('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.albumId, t.photoId] })],
);

/** Activity log shown in the Studio: unlocks, downloads, favourites, code changes. */
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    detail: text('detail').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_album_idx').on(t.albumId, t.createdAt)],
);

/** Code-entry attempts, for rate limiting. Old rows are pruned as new ones arrive. */
export const attempts = pgTable(
  'attempts',
  {
    id: serial('id').primaryKey(),
    ipKey: text('ip_key').notNull(),
    deviceKey: text('device_key').notNull(),
    ok: boolean('ok').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('attempts_time_idx').on(t.createdAt)],
);

/** Editable main-page content (single row, id = 1). */
export const siteContent = pgTable('site_content', {
  id: integer('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Images uploaded in the Studio for the public site (hero, work, portrait). */
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
