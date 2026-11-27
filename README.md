# Michael's Gallery

Portfolio and private client galleries for Michael, photographer in El Salvador.
A dark, editorial "darkroom" site: strictly black and white, with red only on the
client access key.

- **Public site**: hero slideshow, selected work, About, contact. Spanish at `/`, English at `/en`.
- **Client area**: a 6-character code opens a private gallery. The cover develops out of
  black, then a camera flash leads into the gallery: chapters, viewer, favourites, and
  downloads of the untouched originals (single files or ZIPs in ~2 GB parts).
- **Studio** (`/studio`, English): albums from Drive folders, codes, expiry, activity,
  and editing the main page in both languages.

Photos stay in Michael's Google Drive. The site makes web previews once, and pulls
originals from Drive only when someone downloads.

## Running it locally

```bash
npm install
npm run seed      # builds a mock Drive in .data/mock-drive from the sample images
npm run dev       # http://localhost:3000
```

With no settings at all the app uses an embedded Postgres (PGlite, in `.data/db`) and
the mock Drive. Open `http://localhost:3000/studio`, choose **Enter the Studio**
(development sign-in), create an album from one of the sample folders with any code,
then open `http://localhost:3000/acceso` and type that code.

Other commands: `npm test` (unit tests), `npm run lint` (type check), `npm run build`.

## Settings

Copy `.env.example` to `.env.local` and fill in what you need. In production these are
required:

| Variable | What it is |
| --- | --- |
| `APP_SECRET` | 32+ random characters. Signs sessions and preview links, hashes and encrypts codes. Never change it after launch (all codes would stop working). |
| `SITE_URL` | The public address, e.g. `https://michaelsgallery.com` |
| `DATABASE_URL` | Postgres (Supabase or Neon). Migrations in `drizzle/` run automatically on start. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS` | Google sign-in for the Studio, limited to the listed accounts |
| `DRIVE_MODE=google`, `DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Real Google Drive access |

### Connecting Google Drive

1. In [Google Cloud console](https://console.cloud.google.com), create a project and enable the **Google Drive API**.
2. Create a **service account**, then a JSON key for it. Put the whole JSON (one line, or base64) in `GOOGLE_SERVICE_ACCOUNT_JSON`.
3. In Drive, share the top-level **Clientes** folder with the service account's email, as **Viewer**. Put that folder's ID (the last part of its URL) in `DRIVE_ROOT_FOLDER_ID`.
4. Set `DRIVE_MODE=google`.

Each client gets a folder inside Clientes. Subfolders become chapters; start their
names with a number to set the order (`01 Preparativos`, `02 Ceremonia`); the number
is hidden on the site.

### Studio sign-in with Google

In the same Cloud project: APIs & Services, Credentials, **OAuth client ID**, type *Web
application*, redirect URI `{SITE_URL}/api/auth/google/callback`. Put the ID and secret in
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Until then, `ADMIN_PASSWORD` gives a password
sign-in.

## How it works

```
src/
  app/[locale]/        public site, /acceso (/en/access), /galeria (/en/gallery)
  app/studio/          Studio pages and server actions
  app/api/             previews (signed URLs), originals, ZIP streaming, favourites, auth
  lib/albums.ts        create, publish job (previews), sync from Drive, codes, lifecycle
  lib/drive/           Drive interface: google.ts (service account) and mock.ts (disk)
  lib/storage/         preview store (local disk now; S3/R2 slot for hosting)
  lib/zip.ts           streaming ZIP writer (stored, no recompression)
  lib/session.ts       signed gallery session cookie + signed preview URLs
  messages/            Spanish and English text
```

**Access codes.** Exactly 6 letters/numbers typed by Michael, case-insensitive. Stored as
an HMAC (lookup and global uniqueness) plus an encrypted copy so the Studio can show
it. Weak codes get a warning. Five failed tries per device or IP in 15 minutes locks
entry, plus a site-wide cap. A working code is swapped for a signed HttpOnly cookie;
every request re-checks that the album is open and the code wasn't changed. Changing
a code or closing a gallery signs out every device. Optional guest code: view and
favourite, no downloads.

**Publishing.** Creating an album lists the Drive folder, then a background job reads
each original once and stores 2400 px and 640 px WebP previews with all metadata (GPS
included) removed. The job is resumable: *Sync from Drive* adds new photos, drops
deleted ones and redoes edited ones (Drive md5 changed).

**Downloads.** Originals stream from Drive through the server; the browser never sees a
Drive link or file ID. ZIPs stream as they are built, split into ~2 GB parts, with
chapter folders inside.

## Before launch

- Choose hosting. Previews currently go to local disk (`STORAGE_MODE=local`), which needs
  a server with a persistent disk. On Vercel or Cloudflare, add the S3-compatible store
  (R2 or Supabase Storage) behind `lib/storage`.
- Long ZIP downloads and big publish jobs need a host that allows long requests
  (`maxDuration` is set to 800 s for ZIPs).
- Email sending (delivery and the 7-day reminder) is not wired yet; the Studio gives a
  ready-to-copy delivery email.
- Replace the sample images in the Studio's Main page editor with real work and a portrait.
