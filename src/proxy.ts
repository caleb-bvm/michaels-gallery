import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Everything except the Studio, API routes, Next internals and static files
  matcher: ['/((?!api|studio|_next|_vercel|sample|.*\\..*).*)'],
};
