/** Split photos into ZIP parts of about 2 GB, keeping their order. */
export const PART_BYTES = 2 * 1024 ** 3;

export function splitParts<T extends { sizeBytes: number }>(items: T[], max = PART_BYTES): T[][] {
  const parts: T[][] = [];
  let cur: T[] = [];
  let size = 0;
  for (const it of items) {
    if (cur.length && size + it.sizeBytes > max) {
      parts.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(it);
    size += it.sizeBytes;
  }
  if (cur.length) parts.push(cur);
  return parts;
}
