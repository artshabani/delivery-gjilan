import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Try multiple common source names; first found will be used
const candidates = [
  'public/app-icon-source.png',
  'public/06logo.png',
  'public/logo.png',
  'public/icon.png'
];
let src = null;
for (const c of candidates) {
  const p = path.resolve(c);
  if (fs.existsSync(p)) { src = p; break; }
}
const out192 = path.resolve('public/app-icon-192.png');
const out512 = path.resolve('public/app-icon-512.png');
const out32 = path.resolve('public/app-icon-32.png');
const out180 = path.resolve('public/app-icon-180.png'); // iOS apple-touch-icon size
const outSvg192 = path.resolve('public/app-icon-192.svg');
const outSvg512 = path.resolve('public/app-icon-512.svg');
const outSvg = path.resolve('public/app-icon.svg');

if (!src) {
  console.error('\n❌ Source icon not found.');
  console.error('Place your cart logo at one of:');
  for (const c of candidates) console.error(' -', c);
  process.exit(1);
}
console.log('Using source:', src);

async function make(size, out) {
  await sharp(src)
    // Use contain to avoid cropping and preserve full logo
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✅ Wrote ${out}`);
}

async function makeSvg(size, out) {
  const buf = await sharp(src)
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const b64 = buf.toString('base64');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n  <rect width="100%" height="100%" fill="#000"/>\n  <image href="data:image/png;base64,${b64}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>\n</svg>`;
  await fs.promises.writeFile(out, svg, 'utf8');
  console.log(`✅ Wrote ${out}`);
}

(async () => {
  try {
    await make(192, out192);
    await make(512, out512);
    await make(32, out32);
    await make(180, out180);
    await makeSvg(192, outSvg192);
    await makeSvg(512, outSvg512);
    await makeSvg(512, outSvg);
    console.log('\n🎉 Icons generated. Restart dev server and hard refresh.');
  } catch (err) {
    console.error('Failed generating icons:', err);
    process.exit(1);
  }
})();
