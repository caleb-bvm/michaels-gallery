import 'server-only';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { DEFAULT_CONTENT, type SiteContent } from '@/lib/content-types';

export const getContent = cache(async (): Promise<SiteContent> => {
  const db = await getDb();
  const [row] = await db.select().from(schema.siteContent).where(eq(schema.siteContent.id, 1));
  if (!row) return DEFAULT_CONTENT;
  const data = row.data as Partial<SiteContent>;
  return { ...DEFAULT_CONTENT, ...data };
});

export async function saveContent(data: SiteContent) {
  const db = await getDb();
  await db
    .insert(schema.siteContent)
    .values({ id: 1, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteContent.id, set: { data, updatedAt: new Date() } });
}
