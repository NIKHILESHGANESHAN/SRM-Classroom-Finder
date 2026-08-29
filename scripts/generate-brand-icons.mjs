/**
 * One-shot brand icon generator — rasterizes the official ClassFinder logo
 * into favicon, PWA, Apple touch, and maskable assets.
 *
 * Run: node scripts/generate-brand-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "public/brand/classfinder-logo-source.png");
const ICONS_DIR = path.join(ROOT, "public/icons");
const FAVICON_PATH = path.join(ROOT, "app/favicon.ico");

/** Android maskable safe zone — logo fits inside ~80% center circle. */
const MASKABLE_SCALE = 0.72;

async function resizeSquare(size, outPath, { maskable = false } = {}) {
  if (maskable) {
    const logoSize = Math.round(size * MASKABLE_SCALE);
    const offset = Math.round((size - logoSize) / 2);
    const logo = await sharp(SOURCE).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite([{ input: logo, left: offset, top: offset }])
      .png()
      .toFile(outPath);
    return;
  }

  await sharp(SOURCE).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } }).png().toFile(outPath);
}

async function writeFavicon() {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(SOURCE)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .png()
        .toBuffer(),
    ),
  );

  // ICO: PNG-embedded icons (supported by modern browsers).
  const entries = [];
  let offset = 6 + sizes.length * 16;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    entries.push({ size, buf, offset });
    offset += buf.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const dirEntries = Buffer.alloc(sizes.length * 16);
  let dirOffset = 0;
  for (let i = 0; i < sizes.length; i++) {
    const { size, buf, offset: dataOffset } = entries[i];
    const e = dirEntries.subarray(dirOffset, dirOffset + 16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e[4] = 1;
    e[5] = 0;
    e[6] = 32;
    e[7] = 0;
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(dataOffset, 12);
    dirOffset += 16;
  }

  await writeFile(FAVICON_PATH, Buffer.concat([header, dirEntries, ...pngBuffers.map((b) => b)]));
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  await mkdir(path.join(ROOT, "public/brand"), { recursive: true });

  await resizeSquare(192, path.join(ICONS_DIR, "icon-192.png"));
  await resizeSquare(512, path.join(ICONS_DIR, "icon-512.png"));
  await resizeSquare(512, path.join(ICONS_DIR, "icon-maskable-512.png"), { maskable: true });
  await resizeSquare(180, path.join(ICONS_DIR, "apple-touch-icon.png"));
  await writeFavicon();

  console.log("Generated ClassFinder brand icons:");
  console.log("  public/icons/icon-192.png");
  console.log("  public/icons/icon-512.png");
  console.log("  public/icons/icon-maskable-512.png");
  console.log("  public/icons/apple-touch-icon.png");
  console.log("  app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
