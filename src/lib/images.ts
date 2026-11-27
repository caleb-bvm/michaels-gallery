import 'server-only';
import sharp from 'sharp';

sharp.cache(false);
sharp.concurrency(2);

export interface Previews {
  lg: Buffer;
  sm: Buffer;
  width: number;
  height: number;
}

/**
 * Web-sized copies of an original: 2400 px and 640 px on the long edge, WebP.
 * EXIF orientation is applied, then all metadata (GPS included) is dropped.
 */
export async function makePreviews(original: Buffer): Promise<Previews> {
  const base = sharp(original, { failOn: 'none', limitInputPixels: 400_000_000 }).rotate();
  const meta = await base.clone().metadata();
  const lg = await base.clone().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const sm = await base.clone().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height ?? lg.info.height : meta.width ?? lg.info.width;
  const height = rotated ? meta.width ?? lg.info.width : meta.height ?? lg.info.height;
  return { lg: lg.data, sm, width, height };
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(typeof c === 'string' ? Buffer.from(c) : (c as Buffer));
  return Buffer.concat(chunks);
}
