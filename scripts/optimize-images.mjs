// Resizes illustrations to at most 960 px on their long side and re-encodes WebP.
// They display at roughly 340–480 CSS px, so 960 px stays sharp on 2× screens.
// Match Day cards show a square crop at 88–124 CSS px, so they get 256 px thumbnails.
// Usage: node --experimental-strip-types scripts/optimize-images.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { fixtureList, thumbnailPath } from '../lib/fixture-list.ts';

const root = new URL('../public/illustrations/', import.meta.url).pathname;
// Prepare destinations before rewriting any illustration.
await mkdir(join(root, 'thumbs'), { recursive: true });
const MAX = 960;
async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.name.endsWith('.webp')) yield path;
  }
}
let before = 0, after = 0;
for await (const path of files(root)) {
  const input = await readFile(path);
  const { width, height } = await sharp(input).metadata();
  before += input.length;
  if (Math.max(width, height) <= MAX) { after += input.length; continue; }
  const output = await sharp(input)
    .resize(width >= height ? { width: MAX } : { height: MAX })
    .webp({ quality: 76, effort: 6 })
    .toBuffer();
  if (output.length < input.length) await writeFile(path, output);
  after += Math.min(output.length, input.length);
}
console.log(`illustrations: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);

const publicRoot = new URL('../public/', import.meta.url).pathname;
for (const { cover } of fixtureList) {
  const output = await sharp(join(publicRoot, cover)).resize(256, 256, { fit: 'cover' }).webp({ quality: 72, effort: 6 }).toBuffer();
  await writeFile(join(publicRoot, thumbnailPath(cover)), output);
}
console.log(`thumbnails: ${fixtureList.length} Match Day cards`);
