import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { display, text } from '@/app/fonts';
import { TopBar } from '@/components/site/TopBar';
import { Rail } from '@/components/site/Rail';
import { currentGallery } from '@/lib/session';
import { env } from '@/lib/env';
import './site.css';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    alternates: { canonical: locale === 'es' ? '/' : '/en', languages: { es: '/', en: '/en' } },
    openGraph: { title: t('title'), description: t('description'), images: ['/sample/hero1.jpg'], locale },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const g = await currentGallery();

  return (
    <html lang={locale} className={`${display.variable} ${text.variable}`}>
      <body>
        <NextIntlClientProvider>
          <TopBar />
          <Rail gallery={g ? { name: g.album.name, count: g.album.photoCount } : null} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
