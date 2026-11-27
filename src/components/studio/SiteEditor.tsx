'use client';

import { useId, useMemo, useState, useTransition } from 'react';
import { saveSite, uploadImage } from '@/app/studio/actions';
import type { Bi, Img, SiteContent } from '@/lib/content-types';
import { useToast } from './Toast';

const TABS = [
  ['hero', 'Hero'],
  ['work', 'Selected work'],
  ['about', 'About'],
  ['contact', 'Contact'],
] as const;
type Tab = (typeof TABS)[number][0];

const up = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6" /></svg>;
const dn = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 10l6 6 6-6" /></svg>;
const rm = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const move = <T,>(arr: T[], i: number, d: number) => {
  const a = [...arr];
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

export function SiteEditor({ initial }: { initial: SiteContent }) {
  const [saved, setSaved] = useState(() => clone(initial));
  const [c, setC] = useState(() => clone(initial));
  const [tab, setTab] = useState<Tab>('hero');
  const [toast, Toast] = useToast();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const dirty = useMemo(() => JSON.stringify(c) !== JSON.stringify(saved), [c, saved]);

  const set = (fn: (d: SiteContent) => void) =>
    setC((prev) => {
      const d = clone(prev);
      fn(d);
      return d;
    });

  const upload = async (key: string, file: File | undefined, apply: (img: Img) => void) => {
    if (!file) return;
    setUploading(key);
    setError('');
    const fd = new FormData();
    fd.set('file', file);
    const r = await uploadImage(fd);
    setUploading('');
    if (!r.ok) return setError(r.error);
    apply(r.img);
    toast('Image uploaded. Publish to put it live');
  };

  const publish = () =>
    start(async () => {
      setError('');
      const r = await saveSite(c);
      if (!r.ok) return setError(r.error);
      setSaved(clone(c));
      toast('Published. The site is updated');
    });

  return (
    <>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      <div style={{ paddingBottom: 160 }}>
        {tab === 'hero' && (
          <>
            <section className="step">
              <h2>Opening text</h2>
              <p>Large title over the slideshow.</p>
              <Pair label="Title" v={c.hero.title} on={(v) => set((d) => (d.hero.title = v))} />
              <div style={{ height: 12 }} />
              <Pair label="Line under the title" area v={c.hero.line} on={(v) => set((d) => (d.hero.line = v))} />
            </section>
            <section className="step">
              <h2>Slideshow</h2>
              <p>Crossfades every 6 seconds, in this order. Landscape photos work best.</p>
              {c.hero.slides.map((s, i) => (
                <div className="item" key={s.img.src + i}>
                  <ImageSlot img={s.img} busy={uploading === `hero${i}`} onFile={(f) => upload(`hero${i}`, f, (img) => set((d) => (d.hero.slides[i].img = img)))} />
                  <Pair label="Caption" v={s.caption} on={(v) => set((d) => (d.hero.slides[i].caption = v))} />
                  <Order i={i} n={c.hero.slides.length} onMove={(dd) => set((d) => (d.hero.slides = move(d.hero.slides, i, dd)))} onRemove={c.hero.slides.length > 1 ? () => set((d) => d.hero.slides.splice(i, 1)) : undefined} />
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <label className="pill" style={{ cursor: 'pointer' }}>
                  {uploading === 'hero-new' ? 'Uploading…' : 'Add a slide'}
                  <input type="file" accept="image/*" hidden onChange={(e) => upload('hero-new', e.target.files?.[0], (img) => set((d) => d.hero.slides.push({ img, caption: { es: '', en: '' } })))} />
                </label>
              </div>
            </section>
          </>
        )}

        {tab === 'work' && (
          <section className="step">
            <h2>Selected work</h2>
            <p>The editorial spread. The first piece is the largest; five pieces fill the layout best.</p>
            <Pair label="Line beside the heading" v={c.work.intro} on={(v) => set((d) => (d.work.intro = v))} />
            {c.work.pieces.map((w, i) => (
              <div className="item" key={w.img.src + i}>
                <ImageSlot img={w.img} busy={uploading === `work${i}`} onFile={(f) => upload(`work${i}`, f, (img) => set((d) => (d.work.pieces[i].img = img)))} />
                <div style={{ display: 'grid', gap: 12 }}>
                  <Pair label="Title" v={w.title} on={(v) => set((d) => (d.work.pieces[i].title = v))} />
                  <Pair label="Type and year" v={w.meta} on={(v) => set((d) => (d.work.pieces[i].meta = v))} />
                </div>
                <Order i={i} n={c.work.pieces.length} onMove={(dd) => set((d) => (d.work.pieces = move(d.work.pieces, i, dd)))} onRemove={c.work.pieces.length > 1 ? () => set((d) => d.work.pieces.splice(i, 1)) : undefined} />
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <label className="pill" style={{ cursor: 'pointer' }}>
                {uploading === 'work-new' ? 'Uploading…' : 'Add a piece'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => upload('work-new', e.target.files?.[0], (img) => set((d) => d.work.pieces.push({ img, title: { es: '', en: '' }, meta: { es: '', en: '' } })))}
                />
              </label>
            </div>
          </section>
        )}

        {tab === 'about' && (
          <section className="step">
            <h2>About</h2>
            <p>Your photo and two short paragraphs.</p>
            <div className="portrait">
              <div className="ph">{c.about.portrait ? <img src={c.about.portrait.src} alt="" /> : 'No photo yet'}</div>
              <div>
                <label className="pill" style={{ cursor: 'pointer' }}>
                  {uploading === 'portrait' ? 'Uploading…' : c.about.portrait ? 'Replace portrait' : 'Upload portrait'}
                  <input type="file" accept="image/*" hidden onChange={(e) => upload('portrait', e.target.files?.[0], (img) => set((d) => (d.about.portrait = img)))} />
                </label>
                {c.about.portrait && (
                  <button className="pill quiet" style={{ marginLeft: 8 }} onClick={() => set((d) => (d.about.portrait = null))}>
                    Remove
                  </button>
                )}
                <p className="small" style={{ margin: '10px 0 0' }}>
                  Portrait, 4:5. It&apos;s resized for the web; the original stays with you.
                </p>
              </div>
            </div>
            <Pair label="Title" v={c.about.title} on={(v) => set((d) => (d.about.title = v))} />
            <div style={{ height: 12 }} />
            <Pair label="First paragraph" area v={c.about.p1} on={(v) => set((d) => (d.about.p1 = v))} />
            <div style={{ height: 12 }} />
            <Pair label="Second paragraph" area v={c.about.p2} on={(v) => set((d) => (d.about.p2 = v))} />
          </section>
        )}

        {tab === 'contact' && (
          <section className="step">
            <h2>Contact</h2>
            <p>Shown in the footer. The Contact button opens an email to the address here.</p>
            <Pair label="Heading" v={c.contact.heading} on={(v) => set((d) => (d.contact.heading = v))} />
            <div className="fgrid" style={{ marginTop: 16 }}>
              {(
                [
                  ['email', 'Email', 'email'],
                  ['phone', 'Phone and WhatsApp', 'tel'],
                  ['instagram', 'Instagram', 'text'],
                  ['location', 'Based in', 'text'],
                ] as const
              ).map(([k, l, type]) => (
                <div className="f" key={k}>
                  <label htmlFor={`ct-${k}`}>{l}</label>
                  <input id={`ct-${k}`} type={type} value={c.contact[k]} onChange={(e) => set((d) => (d.contact[k] = e.target.value))} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className={`savebar gut${dirty ? ' on' : ''}`}>
        <span>Unsaved changes</span>
        <div className="acts">
          <button className="pill quiet" onClick={() => (setC(clone(saved)), toast('Changes discarded'))}>
            Discard
          </button>
          <button className="pill solid" disabled={pending} onClick={publish}>
            Publish changes
          </button>
        </div>
      </div>
      {Toast}
    </>
  );
}

function Pair({ label, v, on, area }: { label: string; v: Bi; on: (v: Bi) => void; area?: boolean }) {
  const uid = useId();
  const field = (lang: 'es' | 'en') => {
    const id = `${uid}-${lang}`;
    const props = {
      id,
      value: v[lang],
      placeholder: lang === 'en' ? 'Falls back to Spanish' : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => on({ ...v, [lang]: e.target.value }),
    };
    return (
      <div className="f">
        <label htmlFor={id}>
          <b>{lang.toUpperCase()}</b>
          {label}
        </label>
        {area ? <textarea {...props} /> : <input {...props} />}
      </div>
    );
  };
  return (
    <div className="bi">
      {field('es')}
      {field('en')}
    </div>
  );
}

function ImageSlot({ img, busy, onFile }: { img: Img; busy: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <label className="im" style={{ cursor: 'pointer' }} title="Replace image">
      <img src={img.src} alt="" style={{ opacity: busy ? 0.3 : 1 }} />
      <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}

function Order({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: number) => void; onRemove?: () => void }) {
  return (
    <div className="ord">
      <button className="ib" disabled={i === 0} aria-label="Move up" onClick={() => onMove(-1)}>
        {up}
      </button>
      <button className="ib" disabled={i === n - 1} aria-label="Move down" onClick={() => onMove(1)}>
        {dn}
      </button>
      {onRemove && (
        <button className="ib" aria-label="Remove" onClick={onRemove}>
          {rm}
        </button>
      )}
    </div>
  );
}
