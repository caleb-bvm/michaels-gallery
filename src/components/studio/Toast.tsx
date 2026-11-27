'use client';

import { useRef, useState } from 'react';

export function useToast(): [(s: string) => void, React.ReactElement] {
  const [msg, setMsg] = useState('');
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = (s: string) => {
    setMsg(s);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(''), 2000);
  };
  return [
    say,
    <div key="toast" className={`toast${msg ? ' on' : ''}`} role="status">
      {msg}
    </div>,
  ];
}
