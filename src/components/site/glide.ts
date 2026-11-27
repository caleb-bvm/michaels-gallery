/* Smooth, eased travel for the rail: slow start, slow finish. */
let frame = 0;

export function glideTo(y: number) {
  cancelAnimationFrame(frame);
  const y0 = window.scrollY;
  const d = y - y0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(d) < 2) {
    window.scrollTo(0, y);
    return;
  }
  const dur = Math.min(1400, 600 + Math.abs(d) * 0.25);
  const t0 = performance.now();
  const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, y0 + d * ease(p));
    if (p < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

export function stopGlide() {
  cancelAnimationFrame(frame);
}

export const SECTIONS = { home: '', series: 'series', about: 'about', contact: 'contact' } as const;
export type Section = keyof typeof SECTIONS;

export function glideToSection(s: Section) {
  const id = SECTIONS[s];
  const el = id ? document.getElementById(id) : null;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  glideTo(el ? Math.min(max, el.getBoundingClientRect().top + window.scrollY) : 0);
}
