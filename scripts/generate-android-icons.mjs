import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgBuffer = readFileSync(join(root, 'public', 'icons', 'icon.svg'));
const resDir = join(root, 'android', 'app', 'src', 'main', 'res');

const densities = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generate() {
  for (const { name, size } of densities) {
    // Regular icon
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(resDir, name, 'ic_launcher.png'));

    // Round icon (with circular mask via composite)
    const roundSize = size;
    const circle = Buffer.from(
      `<svg width="${roundSize}" height="${roundSize}"><circle cx="${roundSize/2}" cy="${roundSize/2}" r="${roundSize/2}" fill="white"/></svg>`
    );
    const base = await sharp(svgBuffer).resize(roundSize, roundSize).png().toBuffer();
    await sharp(base)
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toFile(join(resDir, name, 'ic_launcher_round.png'));

    console.log(`Generated ${name} icons (${size}x${size})`);
  }
  console.log('Android icons generated!');
}

generate().catch(console.error);
