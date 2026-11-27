'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { albumProgress, listFolders, publishAlbum, scanFolder } from '@/app/studio/actions';
import { deliveryEmail, EVENT_LABELS, fmt, gb } from '@/lib/studio-format';
import { CodeField, type CodeStatus } from './CodeField';
import { useToast } from './Toast';

type Scan = Extract<Awaited<ReturnType<typeof scanFolder>>, { ok: true }>;
const folderSvg = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </svg>
);
const thumb = (id: string) => `/api/studio/thumb?id=${encodeURIComponent(id)}`;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

export function NewAlbumForm({ siteUrl, driveMode }: { siteUrl: string; driveMode: string }) {
  const router = useRouter();
  const [toast, Toast] = useToast();
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState(today());
  const [place, setPlace] = useState('');
  const [folders, setFolders] = useState<{ id: string; name: string }[] | null>(null);
  const [folderErr, setFolderErr] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [guestOn, setGuestOn] = useState(false);
  const [guest, setGuest] = useState('');
  const [guestOk, setGuestOk] = useState(false);
  const [days, setDays] = useState(90);
  const [allowZip, setAllowZip] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [emailLang, setEmailLang] = useState<'es' | 'en'>('es');
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState<null | { id?: string; processed: number; total: number; status: string; err?: string | null }>(null);
  const poll = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    listFolders().then((r) => (r.ok ? setFolders(r.folders) : (setFolderErr(r.error), setFolders([]))));
    return () => clearInterval(poll.current);
  }, []);

  const pickFolder = async (id: string) => {
    setFolder(id);
    setScan(null);
    setCover(null);
    setScanning(true);
    const r = await scanFolder(id);
    setScanning(false);
    if (!r.ok) return setFolderErr(r.error);
    setScan(r);
    setCover(r.candidates[0]?.id ?? null);
  };

  const guestReady = !guestOn || (guestOk && guest !== code);
  const checks: [boolean, string][] = [
    [!!name.trim(), 'Names'],
    [!!scan?.photoCount, 'Drive folder'],
    [!!cover, 'Cover photo'],
    [codeOk, 'Access code'],
    ...(guestOn ? ([[guestReady, 'Guest code']] as [boolean, string][]) : []),
  ];
  const ready = checks.every((c) => c[0]);

  const publish = async () => {
    if (!ready || !folder) return;
    setError('');
    setPublishing({ processed: 0, total: scan?.photoCount ?? 0, status: 'processing' });
    const r = await publishAlbum({
      name,
      eventType,
      eventDate,
      place,
      driveFolderId: folder,
      coverDriveFileId: cover,
      code,
      guestCode: guestOn ? guest : null,
      days,
      allowZip,
      reminder,
      emailLang,
    });
    if (!r.ok) {
      setPublishing(null);
      setError(r.error);
      return;
    }
    const id = r.id;
    setPublishing((p) => p && { ...p, id });
    poll.current = setInterval(async () => {
      const s = await albumProgress(id);
      if (!s) return;
      setPublishing({ id, processed: s.processed, total: s.total, status: s.status, err: s.error });
      if (s.status !== 'processing') clearInterval(poll.current);
    }, 900);
  };

  const expires = new Date(Date.now() + days * 864e5);
  const mail = publishing?.id
    ? deliveryEmail({ name, photoCount: publishing.total, eventDate, expiresAt: expires, emailLang }, code, siteUrl)
    : '';
  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast(`${label} copied`),
      () => toast('Select and copy it manually'),
    );
  const pct = publishing ? Math.round((publishing.processed / Math.max(1, publishing.total)) * 100) : 0;
  const coverName = scan?.candidates.find((c) => c.id === cover)?.name;

  return (
    <div className="cols">
      <form onSubmit={(e) => e.preventDefault()} autoComplete="off" noValidate>
        <section className="step">
          <h2>Client and event</h2>
          <p>Shown on the reveal and in the delivery email.</p>
          <div className="fgrid">
            <div className="f wide">
              <label htmlFor="nm">Names on the reveal</label>
              <input id="nm" placeholder="Sofía & Andrés" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="ev">Event</label>
              <select id="ev" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {Object.entries(EVENT_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="f">
              <label htmlFor="dt">Date</label>
              <input id="dt" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="f wide">
              <label htmlFor="pl">Place</label>
              <input id="pl" placeholder="Suchitoto, El Salvador" maxLength={80} value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="step">
          <h2>Drive folder</h2>
          <p>
            Folders inside &quot;Clientes&quot; in your Google Drive. Subfolders become chapters; start their names with a number
            (&quot;01 Preparativos&quot;) to set the order.
            {driveMode === 'mock' && ' (Development: reading the sample folders on disk.)'}
          </p>
          {folderErr && <p className="err">{folderErr}</p>}
          {!folders && <p className="loading">Reading Drive…</p>}
          <div className="folders">
            {folders?.map((f) => (
              <button key={f.id} type="button" className="folder" aria-pressed={folder === f.id} onClick={() => pickFolder(f.id)}>
                {folderSvg}
                <span>
                  <b>{f.name}</b>
                  <small>
                    {folder === f.id
                      ? scanning
                        ? 'Counting photos…'
                        : scan
                          ? `${scan.photoCount} photos, ${scan.chapters.length} subfolders, ${gb(scan.totalBytes)}`
                          : ''
                      : 'Click to read'}
                  </small>
                </span>
                <span className="tick" />
              </button>
            ))}
            {folders && !folders.length && !folderErr && <p className="small">No folders yet. Create one per client inside &quot;Clientes&quot;.</p>}
          </div>
          {scan && scan.chapters.length > 0 && (
            <div className="chaps">
              <span className="lbl">Chapters found</span>
              {scan.chapters.map((c) => (
                <span key={c.name}>
                  {c.name}
                  <em>{c.count}</em>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="step">
          <h2>Cover</h2>
          <p>The photo that develops out of black when the client opens the gallery.</p>
          {!scan ? (
            <p className="small">Choose a folder first.</p>
          ) : (
            <div className="thumbs">
              {scan.candidates.map((c) => (
                <button key={c.id} type="button" className="thumb" aria-pressed={cover === c.id} aria-label={`Use ${c.name} as cover`} onClick={() => setCover(c.id)}>
                  <img src={thumb(c.id)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="step">
          <h2>Access</h2>
          <p>Write the code the client will type: 6 letters or numbers, different from every other album.</p>
          <CodeField
            id="ncode"
            label="Access code"
            placeholder="SOFI22"
            value={code}
            onChange={(v, s) => {
              setCode(v);
              setCodeOk(s.ok);
            }}
          />
          <div style={{ marginTop: 18 }}>
            <span className="lbl">Gallery stays open</span>
            <div className="seg" style={{ marginTop: 8 }}>
              {[
                [30, '30 days'],
                [60, '60 days'],
                [90, '90 days'],
                [180, '6 months'],
              ].map(([d, l]) => (
                <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d as number)}>
                  {l}
                </button>
              ))}
            </div>
            <p className="small" style={{ margin: '8px 0 0' }}>
              Closes on {fmt(expires)} if you publish today.
            </p>
          </div>
          <div style={{ marginTop: 10 }}>
            <Toggle label='Allow "Download all"' hint="Full ZIP in parts of about 2 GB" on={allowZip} set={setAllowZip} />
            <Toggle label="Guest code" hint="A second, view-only code for family and friends" on={guestOn} set={setGuestOn} />
            {guestOn && (
              <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <CodeField
                  id="gcode"
                  label="Guest code"
                  placeholder="FAMI22"
                  idle="Guests can look and heart favourites, but not download."
                  value={guest}
                  onChange={(v, s: CodeStatus) => {
                    setGuest(v);
                    setGuestOk(s.ok);
                  }}
                />
                {guest && guest === code && <p className="small hint bad">Use a different code from the client&apos;s.</p>}
              </div>
            )}
            <Toggle label="Reminder email" hint="7 days before the gallery closes (once email sending is set up)" on={reminder} set={setReminder} />
          </div>
          <div style={{ marginTop: 18 }}>
            <span className="lbl">Email language</span>
            <div className="seg" style={{ marginTop: 8 }}>
              <button type="button" aria-pressed={emailLang === 'es'} onClick={() => setEmailLang('es')}>
                Español
              </button>
              <button type="button" aria-pressed={emailLang === 'en'} onClick={() => setEmailLang('en')}>
                English
              </button>
            </div>
          </div>
        </section>
      </form>

      <aside className="side">
        <div className="preview">
          <div className="pv" style={cover ? { backgroundImage: `url(${thumb(cover)})` } : undefined}>
            <h3>{name.trim() || 'Client names'}</h3>
            <p>{scan ? `${place.trim() || 'Place'}. ${scan.photoCount} photographs.` : 'Pick a folder to see the photo count'}</p>
          </div>
          <div className="cap">How the reveal will look{coverName ? `: ${coverName}` : ''}</div>
        </div>
        <ul className="check">
          {checks.map(([v, l]) => (
            <li key={l} className={v ? 'ok' : ''}>
              {l}
            </li>
          ))}
        </ul>
        {error && <p className="err">{error}</p>}
        <button className="pill solid" disabled={!ready || !!publishing} onClick={publish}>
          Publish album
        </button>
      </aside>

      {publishing && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Publishing album">
          <div className="sheet">
            {publishing.status === 'processing' || !publishing.id ? (
              <>
                <h3>Publishing</h3>
                <div className="small">
                  {pct < 95 ? 'Reading the originals from Drive, making web previews, stripping location data' : 'Saving the album'}
                </div>
                <div className="prog">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <div className="row small">
                  <span>
                    {publishing.processed} of {publishing.total} photos
                  </span>
                  <span>{pct}%</span>
                </div>
                <p className="small">You can leave this page; publishing continues in the background.</p>
              </>
            ) : (
              <>
                <h3>{publishing.status === 'error' ? `${name} needs attention` : `${name} is live`}</h3>
                {publishing.err ? (
                  <p className="err">{publishing.err}</p>
                ) : (
                  <p className="small" style={{ margin: 0 }}>
                    Send this to the client. The code works until {fmt(expires)}.
                  </p>
                )}
                <div className="codebox" style={{ marginTop: 16 }}>
                  <span className="code">{code}</span>
                </div>
                <div className="mail">{mail}</div>
                <div className="acts">
                  <button className="pill solid" onClick={() => copy(mail, 'Email')}>
                    Copy email
                  </button>
                  <button className="pill" onClick={() => router.push(`/studio/albums/${publishing.id}`)}>
                    Open album
                  </button>
                  <button className="pill quiet" onClick={() => router.push('/studio')}>
                    Back to albums
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {Toast}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} />
    </div>
  );
}
