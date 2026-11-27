import { requireAdminPage } from '@/lib/admin';
import { getContent } from '@/lib/content';
import { SiteEditor } from '@/components/studio/SiteEditor';

export const metadata = { title: 'Main page' };

export default async function SitePage() {
  await requireAdminPage();
  const content = await getContent();
  return (
    <main className="gut">
      <div className="head">
        <div>
          <h1>Main page</h1>
          <p>Edit the public site. Spanish is the main language; leave English empty and it falls back to Spanish.</p>
        </div>
      </div>
      <SiteEditor initial={content} />
    </main>
  );
}
