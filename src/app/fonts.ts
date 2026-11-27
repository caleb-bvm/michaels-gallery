import { Archivo, Bodoni_Moda } from 'next/font/google';

export const display = Bodoni_Moda({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-display',
  display: 'swap',
});

export const text = Archivo({
  subsets: ['latin'],
  variable: '--font-text',
  display: 'swap',
});
