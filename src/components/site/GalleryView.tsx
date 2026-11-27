'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { GalleryData, GPhoto } from '@/lib/gallery-types';
import { splitParts } from '@/lib/zipparts';
import { IconDown, IconHeart, IconLeft, IconRight } from '@/components/icons';
import { FLASH_FLAG } from './AccessView';

const mb = (b: number) => (b / 1024 ** 2).toFixed(1);
const human = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.max(0.1, b / 1024 ** 2).toFixed(0)} MB`);

function startDownload(href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function GalleryView({ data }: { data: GalleryData }) {
  const t = useTranslations('gallery');
  const te = useTranslations('events');
  const format = useFormatter();
  const [filter, setFilter] = useState<string>('all');
  const [favs, setFavs] = useState<Set<string>>(() => new Set(data.favourites));
  const [lb, setLb] = useState<number | null>(null);
  const [zip, setZip] = useState<null | 'all' | 'favs'>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [settle] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(FLASH_FLAG);
    } catch {
      return null;
    }
  });
  const canDownload = data.role === 'client';
  const chapterName = useCallback((id: string | null) => data.chapters.find((c) => c.id === id)?.name ?? '', [data.chapters]);

  const shown = useMemo(
    () =>
      data.photos.filter((p) => (filter === 'all' ? true : filter === 'favs' ? favs.has(p.id) : p.chapterId === filter)),
    [data.photos, filter, favs],
  );

  const say = (s: string) => {
    setToast(s);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  /* develop tiles as they scroll into view */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const d = Number(el.dataset.n ?? 0) % 6;
          setTimeout(() => el.classList.add('in'), d * 120);
          io.unobserve(el);
        }),
      { rootMargin: '0px 0px -5% 0px' },
    );
    grid.querySelectorAll('.tile:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [shown]);

  /* arriving through the camera flash: start overexposed, let the light fall away */
  useLayoutEffect(() => {
    try {
      sessionStorage.removeItem(FLASH_FLAG);
    } catch {}
    if (settle !== 'flash') return;
    const f = flashRef.current;
    const wash = f?.querySelector('.wash') as HTMLElement | null;
    const vh = window.innerHeight;
    let p = 0;
    gridRef.current?.querySelectorAll<HTMLElement>('.tile').forEach((tile) => {
      if (tile.getBoundingClientRect().top < vh) {
        tile.style.setProperty('--p', String(p++));
        tile.classList.add('in', 'pop');
      }
    });
    mainRef.current?.animate(
      [
        { filter: 'brightness(2.4) contrast(.7) grayscale(1)', transform: 'scale(1.04)' },
        { filter: 'brightness(1.3) contrast(.95) grayscale(.3)', offset: 0.45 },
        { filter: 'none', transform: 'none' },
      ],
      { duration: 1500, easing: 'cubic-bezier(.2,.6,.2,1)' },
    );
    const out = wash?.animate([{ opacity: 1 }, { opacity: 0.85, offset: 0.15 }, { opacity: 0 }], { duration: 1200, easing: 'ease-out', fill: 'forwards' });
    if (out) out.onfinish = () => f && (f.hidden = true);
    setTimeout(() => gridRef.current?.querySelectorAll('.tile.pop').forEach((el) => el.classList.remove('pop')), 3200);
  }, [settle]);

  const toggleFav = async (id: string) => {
    const on = !favs.has(id);
    setFavs((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    say(on ? t('added') : t('removed'));
    const r = await fetch('/api/gallery/favourites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ photoId: id, on }),
    }).catch(() => null);
    if (!r?.ok) {
      setFavs((s) => {
        const n = new Set(s);
        if (on) n.delete(id);
        else n.add(id);
        return n;
      });
    }
  };

  const downloadOne = (p: GPhoto) => {
    startDownload(`/api/gallery/photos/${p.id}/original`);
    say(t('singleStarted'));
  };

  /* lightbox */
  const cur = lb === null ? null : shown[lb];
  const step = useCallback((d: number) => setLb((i) => (i === null || !shown.length ? i : (i + d + shown.length) % shown.length)), [shown.length]);
  useEffect(() => {
    if (lb !== null && !shown[lb]) setLb(shown.length ? Math.min(lb, shown.length - 1) : null);
  }, [lb, shown]);
  useEffect(() => {
    if (lb === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'Escape') setLb(null);
      if (e.key.toLowerCase() === 'f' && cur) toggleFav(cur.id);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lb, step, cur]);
  // preload neighbours
  useEffect(() => {
    if (lb === null) return;
    [1, -1].forEach((d) => {
      const n = shown[(lb + d + shown.length) % shown.length];
      if (n) new Image().src = n.lg;
    });
  }, [lb, shown]);
  const touchX = useRef(0);

  useEffect(() => {
    if (!zip) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZip(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zip]);

  const zipSet = zip === 'favs' ? data.photos.filter((p) => favs.has(p.id)) : data.photos;
  const parts = splitParts(zipSet.map((p) => ({ ...p, sizeBytes: p.size })));
  const longDate = (iso: string, utc = false) =>
    format.dateTime(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric', ...(utc ? { timeZone: 'UTC' } : {}) });
  const event = te.has(data.eventType as 'wedding') ? te(data.eventType as 'wedding') : te('other');
  const meta = data.eventDate
    ? data.place
      ? t('metaPlace', { event, place: data.place, date: longDate(data.eventDate, true) })
      : t('metaNoPlace', { event, date: longDate(data.eventDate, true) })
    : data.place
      ? `${event}, ${data.place}.`
      : '';

  const chips = [
    { id: 'all', label: t('all') },
    ...(data.chapters.length > 1 ? data.chapters.map((c) => ({ id: c.id, label: c.name })) : []),
    { id: 'favs', label: `${t('favs')} (${favs.size})` },
  ];

  return (
    <>
      <main ref={mainRef} className={settle ? '' : 'view-in'}>
        <header className="ghead gut">
          <div>
            <h1>{data.name}</h1>
            <div className="meta">
              {meta} {t('openUntil', { date: longDate(data.expiresAt) })}
            </div>
            {!canDownload && <div className="meta">{t('guestNote')}</div>}
          </div>
          {canDownload && (
            <div className="acts">
              {data.allowZip && (
                <>
                  <button className="pill" disabled={!favs.size} onClick={() => setZip('favs')}>
                    {t('downloadFavs', { count: favs.size })}
                  </button>
                  <button className="pill solid" onClick={() => setZip('all')}>
                    {t('downloadAll')}
                  </button>
                </>
              )}
            </div>
          )}
        </header>
        <div className="bar gut">
          <div className="chips" role="group">
            {chips.map((c) => (
              <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <span className="small">
            {filter === 'all'
              ? t('showing', { count: shown.length })
              : t('inChapter', { count: shown.length, chapter: filter === 'favs' ? t('favs') : chapterName(filter) })}
          </span>
        </div>
        <div className="grid gut" ref={gridRef}>
          {shown.map((p, n) => {
            const faved = favs.has(p.id);
            return (
              <figure
                key={p.id}
                className={`tile${settle && n < 12 ? ' in' : ''}`}
                data-n={n}
                tabIndex={0}
                onClick={() => setLb(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) setLb(n);
                }}
              >
                <img src={p.sm} width={p.w} height={p.h} alt={`${chapterName(p.chapterId)} ${p.name}`.trim()} loading={n < 12 ? 'eager' : 'lazy'} decoding="async" />
                {faved && (
                  <svg className="heart" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#f5f5f5" stroke="#0a0a0a" strokeWidth="1" />
                  </svg>
                )}
                <div className="ov">
                  <small>{p.name}</small>
                  <span className="btns">
                    <button
                      className={`ib${faved ? ' fav' : ''}`}
                      aria-label={t('favourite')}
                      aria-pressed={faved}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(p.id);
                      }}
                    >
                      <IconHeart />
                    </button>
                    {canDownload && (
                      <button
                        className="ib"
                        aria-label={t('downloadOriginal')}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadOne(p);
                        }}
                      >
                        <IconDown />
                      </button>
                    )}
                  </span>
                </div>
              </figure>
            );
          })}
        </div>
        {!shown.length && <p className="empty gut">{t('empty')}</p>}
        <p className="small gut" style={{ paddingBottom: 40 }}>
          {t('note')}
        </p>
      </main>

      {cur && (
        <div
          className="lb"
          role="dialog"
          aria-modal="true"
          aria-label={t('viewer')}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          }}
        >
          <div className="lbtop gut">
            <span>{t('of', { n: lb! + 1, total: shown.length })}</span>
            <button className="pill" onClick={() => setLb(null)} autoFocus>
              {t('close')}
            </button>
          </div>
          <div className="stage">
            <img key={cur.id} src={cur.lg} alt={cur.name} />
            <button className="arrow l" aria-label={t('prev')} onClick={() => step(-1)}>
              <IconLeft />
            </button>
            <button className="arrow r" aria-label={t('next')} onClick={() => step(1)}>
              <IconRight />
            </button>
          </div>
          <div className="lbbot gut">
            <span className="small">
              {chapterName(cur.chapterId)
                ? t('photoMeta', { name: cur.name, chapter: chapterName(cur.chapterId), mb: mb(cur.size) })
                : t('photoMetaNoChapter', { name: cur.name, mb: mb(cur.size) })}
            </span>
            <div className="acts">
              <button className="pill" onClick={() => toggleFav(cur.id)} aria-pressed={favs.has(cur.id)}>
                {favs.has(cur.id) ? t('removeFav') : t('addFav')}
              </button>
              {canDownload && (
                <button className="pill solid" onClick={() => downloadOne(cur)}>
                  {t('downloadOriginal')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {zip && (
        <div className="scrim" role="dialog" aria-modal="true" aria-label={t('zipTitle')} onClick={(e) => e.target === e.currentTarget && setZip(null)}>
          <div className="sheet">
            <h3>{t('zipTitle')}</h3>
            <div className="small">{t('zipSub', { count: zipSet.length, size: human(zipSet.reduce((s, p) => s + p.size, 0)) })}</div>
            <ul className="parts">
              {parts.map((part, i) => (
                <li key={i}>
                  <span>
                    {t('zipPart', { n: i + 1, total: parts.length })}
                    <small>{t('zipPartSize', { count: part.length, size: human(part.reduce((s, p) => s + p.size, 0)) })}</small>
                  </span>
                  <a
                    className="pill solid"
                    href={`/api/gallery/zip?set=${zip}&part=${i + 1}`}
                    download
                    onClick={() => say(t('started'))}
                  >
                    {t('download')}
                  </a>
                </li>
              ))}
            </ul>
            <div className="acts">
              <button className="pill" onClick={() => setZip(null)} autoFocus>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? ' on' : ''}`} role="status">
        {toast}
      </div>
      {settle === 'flash' && (
        <div ref={flashRef} className="flash settle" aria-hidden="true">
          <div className="wash" />
        </div>
      )}
    </>
  );
}
