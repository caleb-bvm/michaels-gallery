'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { albumState, EVENT_LABELS, fmt, stateLabel, type AlbumState } from '@/lib/studio-format';
import { useToast } from './Toast';

export interface AlbumCard {
  id: string;
  name: string;
  eventType: string;
  eventDate: string | null;
  status: string;
  expiresAt: string;
  photoCount: number;
  processed: number;
  code: string;
  unlocks: number;
  downloads: number;
  cover: string | null;
}

const FILTERS: [string, string][] = [
  ['all', 'All'],
  ['live', 'Live'],
  ['exp', 'Closing soon'],
  ['processing', 'Processing'],
  ['closed', 'Closed'],
];

export function AlbumsGrid({ albums }: { albums: AlbumCard[] }) {
  const router = useRouter();
  const [toast, Toast] = useToast();
  const [f, setF] = useState('all');
  const st = (a: AlbumCard): AlbumState => albumState(a);
  const n = (s: AlbumState) => albums.filter((a) => st(a) === s).length;
  const open = n('live') + n('exp');
  const unlocks = albums.filter((a) => ['live', 'exp'].includes(st(a))).reduce((s, a) => s + a.unlocks, 0);
  const list = albums.filter((a) => f === 'all' || st(a) === f || (f === 'processing' && st(a) === 'error'));

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast('Code copied'),
      () => toast('Select and copy it manually'),
    );

  return (
    <>
      <div className="figs">
        {[
          [open, 'open galleries'],
          [n('exp'), 'closing within 2 weeks'],
          [n('processing') + n('error'), 'processing'],
          [unlocks, 'unlocks on open galleries'],
        ].map(([v, l]) => (
          <div key={l}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="chips">
        {FILTERS.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="prints">
        {list.map((a) => {
          const s = st(a);
          const badge = s === 'processing' || s === 'error' ? 'draft' : s;
          return (
            <article
              key={a.id}
              className="print"
              tabIndex={0}
              onClick={() => router.push(`/studio/albums/${a.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && router.push(`/studio/albums/${a.id}`)}
            >
              <div className={`cv${s === 'closed' ? ' closed' : ''}`}>
                {a.cover && <img src={a.cover} alt="" />}
                <span className={`badge ${badge}`}>{s === 'processing' ? `Processing ${a.processed}/${a.photoCount}` : stateLabel(a)}</span>
              </div>
              <div className="bd">
                <h3>{a.name}</h3>
                <div className="meta">
                  {EVENT_LABELS[a.eventType] ?? 'Other'}
                  {a.eventDate ? `, ${fmt(a.eventDate)}` : ''}. {a.photoCount} photos
                </div>
                <div className="row">
                  <span className="code">{a.code}</span>
                  <button
                    className="copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      copy(a.code);
                    }}
                  >
                    Copy code
                  </button>
                </div>
                <div className="bot">
                  {s === 'closed'
                    ? `Closed ${fmt(a.expiresAt)}`
                    : s === 'processing'
                      ? 'Making previews from Drive'
                      : s === 'error'
                        ? 'Some photos failed. Open to retry'
                        : `Open until ${fmt(a.expiresAt)}. ${a.unlocks} unlocks, ${a.downloads} downloads`}
                </div>
              </div>
            </article>
          );
        })}
        {!list.length && <p className="small">{albums.length ? 'No albums here.' : 'No albums yet. Create the first one from a Drive folder.'}</p>}
      </div>
      {Toast}
    </>
  );
}
