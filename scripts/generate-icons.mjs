import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const requireFromNext = createRequire(require.resolve('next/package.json'));
const sharp = requireFromNext('sharp');
const source = await readFile(new URL('../app/icon.svg', import.meta.url));
const sizes = [16, 32, 48];
const frames = await Promise.all(
  sizes.map(size => sharp(source).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index++) {
  const entryOffset = 6 + index * 16;
  header[entryOffset] = sizes[index];
  header[entryOffset + 1] = sizes[index];
  header.writeUInt16LE(1, entryOffset + 4);
  header.writeUInt16LE(32, entryOffset + 6);
  header.writeUInt32LE(frames[index].length, entryOffset + 8);
  header.writeUInt32LE(offset, entryOffset + 12);
  offset += frames[index].length;
}
await writeFile(new URL('../app/favicon.ico', import.meta.url), Buffer.concat([header, ...frames]));
await sharp(source).resize(180, 180).png().toFile(fileURLToPath(new URL('../app/apple-icon.png', import.meta.url)));
