'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { glideToSection } from './glide';

export function TopBar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`top gut${solid ? ' solid' : ''}`}>
      <Link
        className="brand"
        href="/"
        onClick={(e) => {
          if (pathname === '/') {
            e.preventDefault();
            glideToSection('home');
          }
        }}
      >
        Michael&apos;s Gallery
      </Link>
      <div className="lang" role="group" aria-label={t('language')}>
        {/* pathname is the internal route; next-intl maps it to /acceso or /access */}
        <Link href={pathname as '/'} locale="es" aria-current={locale === 'es'} lang="es" scroll={false}>
          ES
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={pathname as '/'} locale="en" aria-current={locale === 'en'} lang="en" scroll={false}>
          EN
        </Link>
      </div>
    </header>
  );
}
