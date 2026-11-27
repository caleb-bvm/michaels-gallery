'use client';

import { useEffect, useRef } from 'react';

/** Prints develop out of black as they scroll into view. */
export function Develop({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('in');
            io.disconnect();
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`develop ${className}`}>
      {children}
    </div>
  );
}
