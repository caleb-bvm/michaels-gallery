'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { unlock, type UnlockResult } from '@/app/[locale]/access/actions';
import { CODE_LENGTH, normalizeCode } from '@/lib/codes';

type Msg = { key: 'hint' | 'checking' | 'welcome' | 'wrong' | 'blocked' | 'preparing' | 'error' | 'expired'; date?: string; err?: boolean };
type Reveal = Extract<UnlockResult, { status: 'ok' }>['reveal'];

export const FLASH_FLAG = 'mg-flash';

export function AccessView() {
  const t = useTranslations('access');
  const format = useFormatter();
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [msg, setMsg] = useState<Msg>({ key: 'hint' });
  const [shake, setShake] = useState(0);
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [developed, setDeveloped] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const cardRef = useRef<HTMLFormElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const flashing = useRef(false);

  const code = chars.join('');
  const dateLong = (iso: string) => format.dateTime(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const fill = (raw: string, from = 0) => {
    const c = normalizeCode(raw);
    setChars((prev) => {
      const next = [...prev];
      for (let i = 0; i < c.length && from + i < CODE_LENGTH; i++) next[from + i] = c[i];
      return next;
    });
    const focusAt = Math.min(from + c.length, CODE_LENGTH - 1);
    requestAnimationFrame(() => inputs.current[focusAt]?.focus());
    setMsg({ key: 'hint' });
  };

  // Delivery emails link to /acceso#CODE; the code after # never reaches the server logs.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (!h) return false;
      history.replaceState(null, '', window.location.pathname);
      fill(h);
      return true;
    };
    if (!fromHash()) inputs.current[0]?.focus({ preventScroll: true });
    window.addEventListener('hashchange', fromHash);
    router.prefetch('/gallery');
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shake) {
      const el = cardRef.current;
      el?.classList.remove('shake');
      void el?.offsetWidth;
      el?.classList.add('shake');
    }
  }, [shake]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < CODE_LENGTH || pending) return;
    setMsg({ key: 'checking' });
    start(async () => {
      const r = await unlock(code);
      if (r.status === 'ok') {
        setMsg({ key: 'welcome' });
        setReveal(r.reveal);
        requestAnimationFrame(() => requestAnimationFrame(() => setDeveloped(true)));
        setTimeout(() => enterRef.current?.focus(), 3600);
        return;
      }
      setShake((n) => n + 1);
      if (r.status === 'expired') setMsg({ key: 'expired', date: r.closedOn, err: true });
      else setMsg({ key: r.status, err: true });
    });
  };

  const goIn = (withFlash: boolean) => {
    try {
      sessionStorage.setItem(FLASH_FLAG, withFlash ? 'flash' : 'calm');
    } catch {}
    router.push('/gallery');
  };

  const flashIntoGallery = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !document.body.animate) return goIn(false);
    if (flashing.current) return;
    flashing.current = true;
    const b = enterRef.current!.getBoundingClientRect();
    const f = document.getElementById('flash')!;
    const beam = f.querySelector('.beam') as HTMLElement;
    const wash = f.querySelector('.wash') as HTMLElement;
    const streak = f.querySelector('.streak') as HTMLElement;
    f.style.setProperty('--fx', `${b.left + b.width / 2}px`);
    f.style.setProperty('--fy', `${b.top + b.height / 2}px`);
    f.hidden = false;
    const big = (Math.hypot(window.innerWidth, window.innerHeight) / 40) * 2.6;
    // 1. shutter: the text drops away, the frame blinks shut
    document.querySelector('.rtext')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    document.querySelector('.dev')?.animate(
      [
        { filter: 'none', transform: 'scale(1)' },
        { filter: 'brightness(.25)', transform: 'scale(1.015)', offset: 0.5 },
        { filter: 'brightness(1.4)', transform: 'scale(1.03)' },
      ],
      { duration: 260, easing: 'ease-in', fill: 'forwards' },
    );
    // 2. the flash fires from the button
    setTimeout(() => {
      streak.animate(
        [
          { opacity: 0, transform: 'scaleX(0)' },
          { opacity: 1, transform: 'scaleX(1)', offset: 0.4 },
          { opacity: 0, transform: 'scaleX(1.2) scaleY(30)' },
        ],
        { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
      );
      beam.animate([{ transform: 'scale(0)' }, { transform: `scale(${big})` }], { duration: 260, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
      wash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230, delay: 90, easing: 'ease-in', fill: 'forwards' });
    }, 220);
    // 3. at full white, the gallery takes over and lets the light fall away
    setTimeout(() => goIn(true), 600);
  };

  const sub = reveal
    ? [reveal.place, reveal.date ? dateLong(reveal.date) : null].filter(Boolean).join(', ')
    : '';

  return (
    <main className="access view-in">
      <div className="safe" />
      <div className="acc gut">
        <div>
          <h1>{t('title')}</h1>
          <p className="lede">{t('lede')}</p>
        </div>
        <form ref={cardRef} className="card" onSubmit={submit} autoComplete="off" noValidate>
          <label htmlFor="c0">{t('label')}</label>
          <div className="boxes">
            {chars.map((ch, n) => (
              <span key={n} style={{ display: 'contents' }}>
                {n === 3 && <span />}
                <input
                  id={`c${n}`}
                  ref={(el) => {
                    inputs.current[n] = el;
                  }}
                  value={ch}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t('char', { n: n + 1 })}
                  onChange={(e) => {
                    const v = normalizeCode(e.target.value);
                    if (v.length > 1) return fill(v, n);
                    setChars((prev) => prev.map((c, i) => (i === n ? v.slice(-1) : c)));
                    setMsg({ key: 'hint' });
                    if (v && n < CODE_LENGTH - 1) inputs.current[n + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !ch && n) {
                      setChars((prev) => prev.map((c, i) => (i === n - 1 ? '' : c)));
                      inputs.current[n - 1]?.focus();
                    }
                    if (e.key === 'ArrowLeft' && n) inputs.current[n - 1]?.focus();
                    if (e.key === 'ArrowRight' && n < CODE_LENGTH - 1) inputs.current[n + 1]?.focus();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    fill(e.clipboardData.getData('text'), 0);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </span>
            ))}
          </div>
          <p className={`msg${msg.err ? ' err' : ''}`} aria-live="polite">
            {msg.key === 'expired' ? t('expired', { date: dateLong(msg.date!) }) : t(msg.key)}
          </p>
          <button className="pill solid go" type="submit" disabled={code.length < CODE_LENGTH || pending}>
            {t('go')}
          </button>
        </form>
      </div>

      {reveal &&
        createPortal(
        <div className={`reveal${developed ? ' d' : ''}`} role="dialog" aria-modal="true" aria-label={t('revealLabel')}>
          <div className="dev" style={reveal.cover ? { backgroundImage: `url(${reveal.cover})` } : undefined} />
          <button className="skip" onClick={() => goIn(false)}>
            {t('skip')}
          </button>
          <div className="rtext gut">
            <h1 className="who">{reveal.name}</h1>
            <div className="sub">
              {sub ? `${sub}. ` : ''}
              {t('revealSub', { count: reveal.count })}
            </div>
            <button ref={enterRef} className="pill enter" onClick={flashIntoGallery}>
              {t('enter')}
            </button>
          </div>
          <div id="flash" className="flash" aria-hidden="true" hidden>
            <div className="streak" />
            <div className="beam" />
            <div className="wash" />
          </div>
        </div>,
          document.body,
        )}
    </main>
  );
}
