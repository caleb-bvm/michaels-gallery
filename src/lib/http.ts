import { Readable } from 'node:stream';

export function attachment(filename: string) {
  const ascii = filename.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '') || 'download';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function slug(s: string) {
  return (
    s
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, 'y')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'galeria'
  );
}

export function nodeToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;
}

export function iterToWeb(iter: AsyncIterable<Uint8Array>): ReadableStream<Uint8Array> {
  const it = iter[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(ctrl) {
      try {
        const { value, done } = await it.next();
        if (done) ctrl.close();
        else ctrl.enqueue(value);
      } catch (e) {
        ctrl.error(e);
      }
    },
    async cancel() {
      await it.return?.();
    },
  });
}
