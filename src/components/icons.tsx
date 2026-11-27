const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconHome = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
);
export const IconGrid = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
);
export const IconPerson = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" /></svg>
);
export const IconMail = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></svg>
);
export const IconPhoto = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4.5 4 3.5 2.5-2 4.5 4" /></svg>
);
export const IconKey = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><circle cx="8.5" cy="15.5" r="4" /><path d="M11.4 12.6L19.5 4.5M16.5 7.5l2.5 2.5M14.3 9.7l1.6 1.6" /></svg>
);
export const IconCamera = () => (
  <svg viewBox="0 0 24 24" {...P} strokeWidth={1.4} aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);
export const IconDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 4v11m-5-5l5 5 5-5M5 20h14" /></svg>
);
export const IconLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
);
