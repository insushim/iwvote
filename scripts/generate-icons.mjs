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

// Create ICO file from PNG buffers
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let dataOffset = headerSize + dirSize;

  const entries = pngBuffers.map((png) => {
    // Read PNG dimensions from IHDR chunk
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const entry = { png, width, height, offset: dataOffset, size: png.length };
    dataOffset += png.length;
    return entry;
  });

  const totalSize = headerSize + dirSize + pngBuffers.reduce((s, b) => s + b.length, 0);
  const buf = Buffer.alloc(totalSize);

  // ICO header: reserved(2) + type(2) + count(2)
  buf.writeUInt16LE(0, 0);         // reserved
  buf.writeUInt16LE(1, 2);         // type: 1 = ICO
  buf.writeUInt16LE(numImages, 4); // count

  entries.forEach((e, i) => {
    const off = headerSize + i * dirEntrySize;
    buf.writeUInt8(e.width >= 256 ? 0 : e.width, off);      // width (0 = 256)
    buf.writeUInt8(e.height >= 256 ? 0 : e.height, off + 1); // height
    buf.writeUInt8(0, off + 2);                               // palette
    buf.writeUInt8(0, off + 3);                               // reserved
    buf.writeUInt16LE(1, off + 4);                            // color planes
    buf.writeUInt16LE(32, off + 6);                           // bits per pixel
    buf.writeUInt32LE(e.size, off + 8);                       // size of PNG data
    buf.writeUInt32LE(e.offset, off + 12);                    // offset to PNG data
    e.png.copy(buf, e.offset);
  });

  return buf;
}

async function generate() {
  // Generate PNGs for each size
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (proper ICO format with 16x16 and 32x32)
  const ico16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const icoBuffer = createIco([ico16, ico32, ico48]);
  const { writeFileSync } = await import('fs');
  writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Generated favicon.ico (proper ICO format)');

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
