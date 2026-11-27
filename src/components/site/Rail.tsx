'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { IconGrid, IconHome, IconKey, IconMail, IconPerson, IconPhoto } from '@/components/icons';
import { glideToSection, stopGlide, type Section } from './glide';

const ITEMS: { k: Section; icon: () => React.ReactElement; label: string; hint: string }[] = [
  { k: 'home', icon: IconHome, label: 'home', hint: 'homeHint' },
  { k: 'series', icon: IconGrid, label: 'work', hint: 'workHint' },
  { k: 'about', icon: IconPerson, label: 'about', hint: 'aboutHint' },
  { k: 'contact', icon: IconMail, label: 'contact', hint: 'contactHint' },
];

export function Rail({ gallery }: { gallery: { name: string; count: number } | null }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const onHome = pathname === '/';
  const [current, setCurrent] = useState<Section>('home');

  const spy = useCallback(() => {
    if (!onHome) return;
    let k: Section = 'home';
    for (const [name, id] of [['series', 'series'], ['about', 'about'], ['contact', 'contact']] as const) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) k = name;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) k = 'contact';
    setCurrent(k);
  }, [onHome]);

  useEffect(() => {
    spy();
    window.addEventListener('scroll', spy, { passive: true });
    const stop = () => stopGlide();
    const evs = ['wheel', 'touchstart', 'keydown'] as const;
    evs.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    return () => {
      window.removeEventListener('scroll', spy);
      evs.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [spy]);

  // Arriving on the home page from elsewhere with #series etc.: glide there
  useEffect(() => {
    if (!onHome) return;
    const h = window.location.hash.slice(1) as Section;
    if (h && ['series', 'about', 'contact'].includes(h)) {
      history.replaceState(null, '', window.location.pathname);
      setTimeout(() => glideToSection(h), 150);
    }
  }, [onHome]);

  return (
    <nav className="rail" aria-label={t('label')}>
      <div className="grp">
        {ITEMS.map(({ k, icon: Icon, label, hint }) => (
          <Link
            key={k}
            className="ri"
            href={{ pathname: '/', hash: k === 'home' ? undefined : k }}
            aria-label={t(label)}
            aria-current={onHome && current === k}
            onClick={(e) => {
              if (onHome) {
                e.preventDefault();
                glideToSection(k);
              }
            }}
          >
            <Icon />
            <span className="tip" aria-hidden="true">
              <b>{t(label)}</b>
              <small>{t(hint)}</small>
            </span>
          </Link>
        ))}
      </div>
      <div className="grp">
        {gallery && (
          <Link className="ri" href="/gallery" aria-label={t('gallery')} aria-current={pathname === '/gallery'}>
            <IconPhoto />
            <span className="tip" aria-hidden="true">
              <b>{t('gallery')}</b>
              <small>{t('galleryHint', { name: gallery.name, count: gallery.count })}</small>
            </span>
          </Link>
        )}
        <Link className="ri key" href="/access" aria-label={t('key')} aria-current={pathname === '/access'}>
          <IconKey />
          <span className="tip" aria-hidden="true">
            <b>{t('key')}</b>
            <small>{t('keyHint')}</small>
          </span>
        </Link>
      </div>
    </nav>
  );
}
