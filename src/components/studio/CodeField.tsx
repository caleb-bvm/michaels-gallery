'use client';

import { useEffect, useState } from 'react';
import { checkCode } from '@/app/studio/actions';
import { normalizeCode } from '@/lib/codes';

export type CodeStatus = { ok: boolean; msg: string; bad: boolean };

const IDLE = 'Not case sensitive. The client sees it as six boxes.';

/** A code typed by Michael: 6 letters/numbers, unique across albums, warned if weak. */
export function CodeField({
  id,
  label,
  value,
  onChange,
  albumId,
  placeholder,
  idle = IDLE,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string, status: CodeStatus) => void;
  albumId?: string;
  placeholder?: string;
  idle?: string;
}) {
  const [status, setStatus] = useState<CodeStatus>({ ok: false, msg: idle, bad: false });

  useEffect(() => {
    let live = true;
    const v = normalizeCode(value);
    if (!v) {
      setStatus({ ok: false, msg: idle, bad: false });
      return;
    }
    if (v.length < 6) {
      setStatus({ ok: false, msg: `${6 - v.length} more to go.`, bad: false });
      return;
    }
    const t = setTimeout(async () => {
      const r = await checkCode(v, albumId);
      if (!live) return;
      const s: CodeStatus =
        r.state === 'taken'
          ? { ok: false, msg: `Already used by ${'owner' in r ? r.owner : 'another album'}. Pick another.`, bad: true }
          : r.state === 'same'
            ? { ok: false, msg: 'That is the current code.', bad: false }
            : r.state === 'weak'
              ? { ok: true, msg: 'Works, but it is easy to guess. Mixing letters and numbers is safer.', bad: false }
              : r.state === 'ok'
                ? { ok: true, msg: 'Good. Nobody else has this code.', bad: false }
                : { ok: false, msg: idle, bad: false };
      setStatus(s);
      onChange(v, s);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, albumId]);

  return (
    <div>
      <div className="f" style={{ maxWidth: 340 }}>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          className="codein"
          maxLength={6}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            const v = normalizeCode(e.target.value);
            onChange(v, { ok: false, msg: '', bad: false });
          }}
        />
      </div>
      <p className={`small hint${status.bad ? ' bad' : ''}`} aria-live="polite">
        {status.msg}
      </p>
    </div>
  );
}
