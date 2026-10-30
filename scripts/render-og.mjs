// Renders the social preview card: node scripts/render-og.mjs
import sharp from 'sharp';

const source = new URL('./og-card.svg', import.meta.url);
const target = new URL('../public/og.png', import.meta.url);
const info = await sharp(source.pathname).png({ compressionLevel: 9, effort: 10 }).toFile(target.pathname);
console.log(`public/og.png ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
