import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Spanish lives at the root (/), English under /en
  localePrefix: 'as-needed',
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/access': { es: '/acceso', en: '/access' },
    '/gallery': { es: '/galeria', en: '/gallery' },
  },
});

export type Locale = (typeof routing.locales)[number];
