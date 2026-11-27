/*
 * Folder and file ordering. Subfolders may start with a number to set their
 * order ("01 Preparativos", "2 - Ceremonia", "03_Fiesta"); the number is hidden.
 */

const PREFIX = /^\s*(\d{1,4})\s*[-_.)]?\s+|^\s*(\d{1,4})\s*[-_.)]\s*/;

export function parseChapterName(raw: string): { name: string; order: number | null } {
  const m = raw.match(PREFIX);
  if (!m) return { name: raw.trim(), order: null };
  const name = raw.slice(m[0].length).trim();
  if (!name) return { name: raw.trim(), order: null };
  return { name, order: Number(m[1] ?? m[2]) };
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export const naturalCompare = (a: string, b: string) => collator.compare(a, b);

/** Prefixed folders first, by number; the rest alphabetically after them. */
export function sortChapters<T extends { rawName: string }>(items: T[]): (T & { name: string; sort: number })[] {
  return items
    .map((it) => ({ it, p: parseChapterName(it.rawName) }))
    .sort((a, b) => {
      const ao = a.p.order ?? Number.POSITIVE_INFINITY;
      const bo = b.p.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return naturalCompare(a.p.name, b.p.name);
    })
    .map(({ it, p }, i) => ({ ...it, name: p.name, sort: i }));
}
