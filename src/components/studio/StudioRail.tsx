'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function StudioRail() {
  const path = usePathname();
  const albums = path === '/studio' || path.startsWith('/studio/albums');
  return (
    <nav className="rail" aria-label="Studio">
      <div className="grp">
        <Link className="ri" href="/studio" aria-label="Albums" aria-current={albums}>
          <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
          <span className="tip" aria-hidden="true"><b>Albums</b><small>Every client gallery and its code</small></span>
        </Link>
        <Link className="ri" href="/studio/site" aria-label="Main page" aria-current={path === '/studio/site'}>
          <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 13h8M8 16h5" /></svg>
          <span className="tip" aria-hidden="true"><b>Main page</b><small>Hero, work, About, contact</small></span>
        </Link>
      </div>
      <div className="grp">
        <Link className="ri add" href="/studio/new" aria-label="New album" aria-current={path === '/studio/new'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          <span className="tip" aria-hidden="true"><b>New album</b><small>From a Drive folder to a code</small></span>
        </Link>
      </div>
    </nav>
  );
}
