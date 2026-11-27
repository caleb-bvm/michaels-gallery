import type { Metadata, Viewport } from 'next';
import { display, text } from '@/app/fonts';
import { getAdmin } from '@/lib/admin';
import { StudioRail } from '@/components/studio/StudioRail';
import { logout } from './actions';
import './studio.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Studio', template: "%s · Michael's Gallery Studio" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0a0a0a', viewportFit: 'cover' };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>
        {admin && (
          <>
            <header className="top gut">
              <a className="brand" href="/studio">
                <b>Michael&apos;s Gallery</b>
                <span>Studio</span>
              </a>
              <div className="topacts">
                <a className="pill quiet" href="/" target="_blank" rel="noopener">
                  View site
                </a>
                <form action={logout}>
                  <button className="logout" type="submit" title={admin.email}>
                    Sign out
                  </button>
                </form>
              </div>
            </header>
            <StudioRail />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
