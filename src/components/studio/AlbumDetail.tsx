'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changeCode, close, extend, removeAlbum, retryProcessing, saveDetails, sync } from '@/app/studio/actions';
import { albumState, daysLeft, deliveryEmail, EVENT_LABELS, fmt, local, stateLabel, TZ } from '@/lib/studio-format';
import { CodeField } from './CodeField';
import { useToast } from './Toast';

interface Props {
  siteUrl: string;
  album: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string | null;
    place: string;
    status: string;
    expiresAt: string;
    allowZip: boolean;
    emailLang: string;
    photoCount: number;
    processed: number;
    publishError: string | null;
    driveFolderName: string;
    coverPhotoId: string | null;
    cover: string | null;
  };
  code: string;
  guestCode: string | null;
  counts: { unlocks: number; zips: number; singles: number };
  photos: { id: string; name: string; thumb: string; chapter: string }[];
  favourites: string[];
  events: { id: number; type: string; detail: string; at: string }[];
}

const EVENT_NAMES: Record<string, string> = {
  unlock: 'Unlocked',
  download: 'Downloaded',
  zip: 'Downloaded ZIP',
  favourite: 'Favourited',
  unfavourite: 'Removed favourite',
  published: 'Published',
  synced: 'Synced from Drive',
  extended: 'Extended',
  reopened: 'Reopened',
  closed: 'Closed',
  code_changed: 'Code changed',
};

const when = (iso: string) => {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const day = local(iso);
  if (day === local(new Date())) return `Today, ${hm}`;
  if (day === local(new Date(Date.now() - 864e5))) return `Yesterday, ${hm}`;
  return `${fmt(day).replace(/ \d{4}$/, '')}, ${hm}`;
};

export function AlbumDetail({ siteUrl, album: a, code, guestCode, counts, photos, favourites, events }: Props) {
  const router = useRouter();
  const [toast, Toast] = useToast();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<null | 'rotate' | 'revoke' | 'guest' | 'delete' | 'edit'>(null);
  const [newCode, setNewCode] = useState('');
  const [newOk, setNewOk] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState({ name: a.name, eventType: a.eventType, eventDate: a.eventDate ?? '', place: a.place, coverPhotoId: a.coverPhotoId, allowZip: a.allowZip, emailLang: a.emailLang });
  const s = albumState(a);
  const favPhotos = favourites.map((id) => photos.find((p) => p.id === id)).filter((p): p is Props['photos'][number] => !!p);
  const mail = deliveryEmail(a, code, siteUrl);

  // While previews are being made, refresh every few seconds
  useEffect(() => {
    if (a.status !== 'processing') return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [a.status, router]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, done: string | ((r: Record<string, unknown>) => string)) =>
    start(async () => {
      setError('');
      const r = await fn();
      if (!r.ok) return setError(r.error ?? 'Something went wrong.');
      setAsk(null);
      setNewCode('');
      toast(typeof done === 'string' ? done : done(r));
      router.refresh();
    });

  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast(`${label} copied`),
      () => toast('Select and copy it manually'),
    );

  const confirmBox = (key: typeof ask, body: React.ReactNode) =>
    ask === key && (
      <div className="confirm on">
        {body}
        {error && <p className="err">{error}</p>}
      </div>
    );

  return (
    <main>
      <div className="band">
        {a.cover && <img src={a.cover} alt="" />}
        <div className="gut">
          <div>
            <h1>{a.name}</h1>
            <div className="meta">
              {EVENT_LABELS[a.eventType] ?? 'Other'}
              {a.eventDate ? `, ${fmt(a.eventDate)}` : ''}
              {a.place ? `. ${a.place}` : ''}. {stateLabel(a)}.
            </div>
          </div>
          <div className="acts">
            <button className="pill" disabled={pending} onClick={() => run(() => sync(a.id), (r) => `Drive checked: ${r.added} new, ${r.removed} removed, ${r.changed} updated`)}>
              Sync from Drive
            </button>
            <a className="pill solid" href={`/acceso#${code}`} target="_blank" rel="noopener">
              Open as client
            </a>
          </div>
        </div>
      </div>
      <div className="gut">
        <Link className="back" href="/studio">
          ← All albums
        </Link>
      </div>
      <div className="dgrid gut">
        <div>
          {(s === 'processing' || s === 'error') && (
            <div className="panel">
              <h2>{s === 'processing' ? 'Making previews' : 'Needs attention'}</h2>
              <div className="prog">
                <i style={{ width: `${Math.round((a.processed / Math.max(1, a.photoCount)) * 100)}%` }} />
              </div>
              <div className="row small">
                <span>
                  {a.processed} of {a.photoCount} photos from &quot;{a.driveFolderName}&quot;
                </span>
              </div>
              {a.publishError && <p className="err">{a.publishError}</p>}
              {s === 'error' && (
                <button className="pill" disabled={pending} onClick={() => run(() => retryProcessing(a.id), 'Retrying the failed photos')}>
                  Retry
                </button>
              )}
            </div>
          )}
          <div className="figs">
            {[
              [a.photoCount, 'photos'],
              [counts.unlocks, 'unlocks'],
              [counts.zips, 'ZIP downloads'],
              [counts.singles, 'single downloads'],
              [favourites.length, 'favourites'],
            ].map(([v, l]) => (
              <div key={l}>
                <b>{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="row">
              <h2>Client favourites</h2>
              <button className="copy" disabled={!favPhotos.length} onClick={() => copy(favPhotos.map((p) => p.name).join('\n'), 'File names')}>
                Copy file names
              </button>
            </div>
            <p className="small" style={{ margin: '-4px 0 14px' }}>
              Useful for prints or an album layout.
            </p>
            {favPhotos.length ? (
              <div className="favs">
                {favPhotos.map((p) => (
                  <figure key={p.id}>
                    <div className="fi">
                      <img src={p.thumb} alt="" loading="lazy" />
                    </div>
                    <figcaption>{p.name}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="small">No favourites yet.</p>
            )}
          </div>
          <div className="panel">
            <h2>Activity</h2>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="t">{when(e.at)}</td>
                      <td>{EVENT_NAMES[e.type] ?? e.type}</td>
                      <td>{e.detail}</td>
                    </tr>
                  ))}
                  {!events.length && (
                    <tr>
                      <td colSpan={3} className="small">
                        Nothing yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Access code</h2>
            <div className="codebox">
              <span className="code" style={{ textDecoration: s === 'closed' ? 'line-through' : 'none' }}>
                {code}
              </span>
              <button className="copy" onClick={() => copy(code, 'Code')}>
                Copy
              </button>
            </div>
            <p className="small" style={{ margin: '12px 0 0' }}>
              {s === 'closed'
                ? `Closed. The code no longer works. Reopen to give access until ${fmt(new Date(Date.now() + 30 * 864e5))}.`
                : `Works until ${fmt(a.expiresAt)}, ${daysLeft(a.expiresAt)} days from today.`}
            </p>
            <div className="acts" style={{ marginTop: 14 }}>
              <button className="pill" disabled={pending} onClick={() => run(() => extend(a.id, 30), s === 'closed' ? 'Gallery reopened for 30 days' : 'Extended 30 days')}>
                {s === 'closed' ? 'Reopen for 30 days' : 'Extend 30 days'}
              </button>
              <button className="pill" onClick={() => (setAsk('rotate'), setError(''))}>
                Change code
              </button>
              <button className="pill" disabled={s === 'closed'} onClick={() => (setAsk('revoke'), setError(''))}>
                Close gallery
              </button>
            </div>
            {confirmBox(
              'rotate',
              <>
                The current code stops working on every device that used it. Send the client the new one.
                <div style={{ marginTop: 10 }}>
                  <CodeField
                    id="rcode"
                    label="New code"
                    albumId={a.id}
                    idle="6 letters or numbers."
                    value={newCode}
                    onChange={(v, st) => {
                      setNewCode(v);
                      setNewOk(st.ok);
                    }}
                  />
                </div>
                <div className="acts">
                  <button className="pill solid" disabled={!newOk || pending} onClick={() => run(() => changeCode(a.id, 'client', newCode), 'Code changed. The old one no longer works')}>
                    Save new code
                  </button>
                  <button className="pill quiet" onClick={() => setAsk(null)}>
                    Cancel
                  </button>
                </div>
              </>,
            )}
            {confirmBox(
              'revoke',
              <>
                The client loses access right away. Photos stay in Drive and you can reopen it later.
                <div className="acts">
                  <button className="pill solid" disabled={pending} onClick={() => run(() => close(a.id), 'Gallery closed')}>
                    Close it
                  </button>
                  <button className="pill quiet" onClick={() => setAsk(null)}>
                    Cancel
                  </button>
                </div>
              </>,
            )}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div className="row">
                <span className="lbl">Guest code (view only)</span>
                {guestCode ? (
                  <span className="row" style={{ gap: 8 }}>
                    <span className="code">{guestCode}</span>
                    <button className="copy" onClick={() => copy(guestCode, 'Guest code')}>
                      Copy
                    </button>
                  </span>
                ) : (
                  <span className="small">None</span>
                )}
              </div>
              <div className="acts" style={{ marginTop: 10 }}>
                <button className="pill quiet" onClick={() => (setAsk('guest'), setError(''))}>
                  {guestCode ? 'Change guest code' : 'Add guest code'}
                </button>
                {guestCode && (
                  <button className="pill quiet" disabled={pending} onClick={() => run(() => changeCode(a.id, 'guest', null), 'Guest code removed')}>
                    Remove
                  </button>
                )}
              </div>
              {confirmBox(
                'guest',
                <>
                  Guests can look and heart favourites, but not download.
                  <div style={{ marginTop: 10 }}>
                    <CodeField
                      id="gcode"
                      label="Guest code"
                      albumId={a.id}
                      idle="6 letters or numbers, different from the client code."
                      value={newCode}
                      onChange={(v, st) => {
                        setNewCode(v);
                        setNewOk(st.ok && v !== code);
                      }}
                    />
                  </div>
                  <div className="acts">
                    <button className="pill solid" disabled={!newOk || pending} onClick={() => run(() => changeCode(a.id, 'guest', newCode), 'Guest code saved')}>
                      Save guest code
                    </button>
                    <button className="pill quiet" onClick={() => setAsk(null)}>
                      Cancel
                    </button>
                  </div>
                </>,
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Delivery email</h2>
            <div className="mail">{mail}</div>
            <button className="copy" onClick={() => copy(mail, 'Email')}>
              Copy email
            </button>
          </div>

          <div className="panel">
            <div className="row">
              <h2>Details</h2>
              <button className="copy" onClick={() => setAsk(ask === 'edit' ? null : 'edit')}>
                {ask === 'edit' ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {ask === 'edit' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="f">
                  <label htmlFor="enm">Names on the reveal</label>
                  <input id="enm" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
                <div className="f">
                  <label htmlFor="eev">Event</label>
                  <select id="eev" value={edit.eventType} onChange={(e) => setEdit({ ...edit, eventType: e.target.value })}>
                    {Object.entries(EVENT_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="f">
                  <label htmlFor="edt">Date</label>
                  <input id="edt" type="date" value={edit.eventDate} onChange={(e) => setEdit({ ...edit, eventDate: e.target.value })} />
                </div>
                <div className="f">
                  <label htmlFor="epl">Place</label>
                  <input id="epl" value={edit.place} maxLength={80} onChange={(e) => setEdit({ ...edit, place: e.target.value })} />
                </div>
                <div className="toggle">
                  <span>
                    Allow &quot;Download all&quot;<small>Full ZIP in parts of about 2 GB</small>
                  </span>
                  <button type="button" className="sw" role="switch" aria-checked={edit.allowZip} onClick={() => setEdit({ ...edit, allowZip: !edit.allowZip })} />
                </div>
                <div>
                  <span className="lbl">Email language</span>
                  <div className="seg" style={{ marginTop: 8 }}>
                    <button type="button" aria-pressed={edit.emailLang === 'es'} onClick={() => setEdit({ ...edit, emailLang: 'es' })}>
                      Español
                    </button>
                    <button type="button" aria-pressed={edit.emailLang === 'en'} onClick={() => setEdit({ ...edit, emailLang: 'en' })}>
                      English
                    </button>
                  </div>
                </div>
                <div>
                  <span className="lbl">Cover</span>
                  <div className="covers" style={{ marginTop: 8 }}>
                    {photos.map((p) => (
                      <button key={p.id} type="button" className="thumb" aria-pressed={edit.coverPhotoId === p.id} aria-label={`Use ${p.name} as cover`} onClick={() => setEdit({ ...edit, coverPhotoId: p.id })}>
                        <img src={p.thumb} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="err">{error}</p>}
                <button className="pill solid" disabled={pending} onClick={() => run(() => saveDetails(a.id, edit), 'Details saved')}>
                  Save details
                </button>
              </div>
            ) : (
              <p className="small" style={{ margin: 0 }}>
                Drive folder &quot;{a.driveFolderName}&quot;. Email in {a.emailLang === 'en' ? 'English' : 'Spanish'}. {a.allowZip ? 'ZIP downloads on.' : 'ZIP downloads off.'}
              </p>
            )}
            <div style={{ marginTop: 14 }}>
              <button className="pill quiet" onClick={() => (setAsk('delete'), setError(''))}>
                Delete album
              </button>
              {confirmBox(
                'delete',
                <>
                  Deletes the album, its codes, previews, favourites and activity from the site. Your photos in Drive are not touched.
                  <div className="acts">
                    <button
                      className="pill solid"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await removeAlbum(a.id);
                          if (!r.ok) return setError(r.error);
                          router.push('/studio');
                        })
                      }
                    >
                      Delete it
                    </button>
                    <button className="pill quiet" onClick={() => setAsk(null)}>
                      Cancel
                    </button>
                  </div>
                </>,
              )}
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </main>
  );
}
