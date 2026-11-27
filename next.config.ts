import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  serverExternalPackages: ['sharp', '@electric-sql/pglite'],
  images: {
    localPatterns: [{ pathname: '/sample/**' }, { pathname: '/api/media/**' }],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 82],
  },
  experimental: {
    serverActions: { bodySizeLimit: '30mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
