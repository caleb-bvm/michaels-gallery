'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Slide {
  src: string;
  caption: string;
}

export function Hero({ slides, title, line, label }: { slides: Slide[]; title: string; line: string; label: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setI((n) => (n + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="hero" aria-label={label}>
      {slides.map((s, n) => (
        <div key={s.src + n} className={`slide${n === i ? ' on' : ''}`} aria-hidden={n !== i}>
          <Image src={s.src} alt={s.caption} fill priority={n === 0} sizes="100vw" quality={82} />
        </div>
      ))}
      <div className="herotext gut">
        <div>
          <h1>{title}</h1>
          {line && <p>{line}</p>}
        </div>
        <div className="cap" aria-live="off">
          {slides[i]?.caption}
        </div>
      </div>
    </section>
  );
}
