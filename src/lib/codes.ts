/*
 * Access-code rules, shared by the server and the Studio UI.
 * A code is exactly 6 letters or digits, typed by Michael, case-insensitive.
 */

export const CODE_LENGTH = 6;

export function normalizeCode(input: string): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export function isValidCodeFormat(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${CODE_LENGTH}}$`).test(code);
}

const SEQUENCES = ['0123456789', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const COMMON = new Set([
  'ABC123', '123ABC', 'PASSWO', 'SECRET', 'CODIGO', 'ACCESO', 'GALERI', 'GALLER', 'FOTOS1',
  'PHOTOS', 'QWERTY', 'AAA111', 'ABCABC', '112233', '121212', '123123', 'BODA20', 'WEDDIN',
]);

/** Easy-to-guess codes. They still work; the Studio warns before using one. */
export function isWeakCode(code: string): boolean {
  const c = normalizeCode(code);
  if (c.length < CODE_LENGTH) return false;
  if (/^(.)\1+$/.test(c)) return true; // AAAAAA
  if (/^(..)\1+$/.test(c) || /^(...)\1$/.test(c)) return true; // ABABAB, ABCABC
  if (/^\d+$/.test(c)) return true; // only digits (dates, phone fragments)
  if (/^[A-Z]+$/.test(c) && new Set(c).size <= 2) return true;
  for (const s of SEQUENCES) {
    const rev = [...s].reverse().join('');
    if (s.includes(c) || rev.includes(c)) return true;
  }
  return COMMON.has(c);
}

export type CodeCheck =
  | { state: 'empty' }
  | { state: 'short'; missing: number }
  | { state: 'taken' }
  | { state: 'weak' }
  | { state: 'ok' };

/** Local checks only; uniqueness needs the server. */
export function checkCodeLocally(code: string): CodeCheck {
  const c = normalizeCode(code);
  if (!c) return { state: 'empty' };
  if (c.length < CODE_LENGTH) return { state: 'short', missing: CODE_LENGTH - c.length };
  return isWeakCode(c) ? { state: 'weak' } : { state: 'ok' };
}
