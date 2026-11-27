import { crc32 } from 'node:zlib';

/*
 * Minimal streaming ZIP writer, "stored" (no compression: JPEGs don't shrink).
 * Each entry is streamed straight through with a data descriptor, so nothing
 * is buffered and the download starts with the first byte from Drive.
 * Parts stay under 4 GB, so classic (non-ZIP64) headers are enough.
 */

export interface ZipEntry {
  name: string;
  open: () => Promise<AsyncIterable<Uint8Array | Buffer | string>>;
}

function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export async function* zipStream(entries: ZipEntry[], now = new Date()): AsyncGenerator<Uint8Array> {
  const { time, date } = dosDateTime(now);
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0808, 6); // data descriptor + UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    // crc and sizes (14..25) are zero; they follow in the data descriptor
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    yield local;
    yield name;

    let crc = 0;
    let size = 0;
    for await (const chunk of await entry.open()) {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      crc = crc32(buf, crc);
      size += buf.length;
      yield buf instanceof Buffer ? buf : Buffer.from(buf);
    }
    if (size >= 0xffffffff || offset >= 0xffffffff) throw new Error('ZIP part too large');

    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc >>> 0, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);
    yield desc;

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0808, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc >>> 0, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += 30 + name.length + size + 16;
  }

  const cdBuf = Buffer.concat(central);
  yield cdBuf;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  yield end;
}
