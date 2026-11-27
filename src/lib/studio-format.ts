/** Calendar date (YYYY-MM-DD) in El Salvador, the same on the server and in any browser. */
export const TZ = 'America/El_Salvador';
export function local(d: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "14 Nov 2026". Date-only strings are read as calendar dates, not UTC instants. */
export function fmt(d: Date | string | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return `${day} ${MONTHS[m - 1]} ${y}`;
  }
  return fmt(local(d));
}

export function fmtEs(d: Date | string | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return `${day} de ${MES[m - 1]} de ${y}`;
  }
  return fmtEs(local(d));
}

export const daysLeft = (d: Date | string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);

export type AlbumState = 'processing' | 'error' | 'live' | 'exp' | 'closed';

export function albumState(a: { status: string; expiresAt: Date | string }): AlbumState {
  if (a.status === 'processing') return 'processing';
  if (a.status === 'error') return 'error';
  if (a.status === 'closed' || daysLeft(a.expiresAt) <= 0) return 'closed';
  return daysLeft(a.expiresAt) <= 14 ? 'exp' : 'live';
}

export function stateLabel(a: { status: string; expiresAt: Date | string }): string {
  const s = albumState(a);
  return { processing: 'Processing', error: 'Needs attention', live: 'Live', exp: `Closes in ${daysLeft(a.expiresAt)} days`, closed: 'Closed' }[s];
}

export const EVENT_LABELS: Record<string, string> = {
  wedding: 'Wedding',
  xv: 'XV años',
  portrait: 'Portrait session',
  family: 'Family',
  commercial: 'Commercial',
  other: 'Other',
};

export function gb(bytes: number) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

export function deliveryEmail(a: { name: string; photoCount: number; eventDate: string | null; expiresAt: Date | string; emailLang: string }, code: string, siteUrl: string) {
  const host = siteUrl.replace(/^https?:\/\//, '');
  if (a.emailLang === 'en') {
    return `Hi ${a.name},\n\nYour photographs are ready: ${a.photoCount} of them${a.eventDate ? `, from ${fmt(a.eventDate)}` : ''}.\n\nOpen your gallery: ${host}/en/access#${code}\nYour code: ${code}\n\nYou can download every original in full resolution until ${fmt(a.expiresAt)}.\n\nMichael`;
  }
  return `Hola, ${a.name}:\n\nTus fotografías están listas. Son ${a.photoCount}${a.eventDate ? `, del ${fmtEs(a.eventDate)}` : ''}.\n\nAbre tu galería: ${host}/acceso#${code}\nTu código: ${code}\n\nPuedes descargar todos los originales en resolución completa hasta el ${fmtEs(a.expiresAt)}.\n\nMichael`;
}
