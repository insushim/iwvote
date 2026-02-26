import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');
const publicDir = join(root, 'public');

mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(join(iconsDir, 'icon.svg'));

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

async function generate() {
  // Generate PNGs for each size
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (32x32 PNG as ico)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // Generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate maskable icon with padding (for Android)
  const maskableSize = 512;
  const padding = Math.round(maskableSize * 0.1);
  const innerSize = maskableSize - padding * 2;

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 59, g: 130, b: 246, alpha: 1 },
    })
    .png()
    .toFile(join(iconsDir, 'maskable-512x512.png'));
  console.log('Generated maskable-512x512.png');

  // OG image / thumbnail (1200x630)
  const ogWidth = 1200;
  const ogHeight = 630;
  const iconSize = 200;

  const ogIcon = await sharp(svgBuffer)
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 },
    },
  })
    .composite([
      {
        input: ogIcon,
        left: Math.round((ogWidth - iconSize) / 2),
        top: Math.round((ogHeight - iconSize) / 2) - 40,
      },
    ])
    .png()
    .toFile(join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png');

  console.log('All icons generated!');
}

generate().catch(console.error);
