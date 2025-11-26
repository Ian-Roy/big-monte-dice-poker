/**
 * Procedurally generate:
 *  - icons: assets/icons/icon-192.png, icon-512.png (maskable-friendly simple glyph)
 *  - manifest.json for game assets
 *  - a tiny player sprite (player_dot.png)
 *
 * This keeps the project entirely offline with no external downloads.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

// Assets live under public/assets so Vite copies them verbatim to dist/assets
const ASSETS = 'public/assets';
const ICONS_DIR = join(ASSETS, 'icons');
const IMG_DIR = join(ASSETS, 'img');

function ensure(dir: string) {
  mkdirSync(dir, { recursive: true });
}

// Draw a filled circle onto a PNG buffer
function circlePng(size: number, bg = 0x0b1020ff, fg = 0x2bd4ffff) {
  const png = new PNG({ width: size, height: size });
  // Fill bg
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(png, x, y, bg);
    }
  }
  // Draw circle
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) set(png, x, y, fg);
    }
  }
  return PNG.sync.write(png);
}

function set(png: any, x: number, y: number, rgba: number) {
  const idx = (png.width * y + x) << 2;
  png.data[idx + 0] = (rgba >> 24) & 0xff;
  png.data[idx + 1] = (rgba >> 16) & 0xff;
  png.data[idx + 2] = (rgba >> 8) & 0xff;
  png.data[idx + 3] = rgba & 0xff;
}

// Simple dot sprite (16x16)
function playerDotPng() {
  const size = 16;
  const png = new PNG({ width: size, height: size });
  // transparent
  for (let i = 0; i < png.data.length; i += 4) png.data[i + 3] = 0;
  // dot
  const fg = [0x2b, 0xd4, 0xff, 0xff];
  const cx = 8, cy = 8, r = 5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (Math.hypot(x - cx, y - cy) <= r) {
      const idx = (size * y + x) << 2;
      png.data[idx] = fg[0]; png.data[idx+1] = fg[1]; png.data[idx+2] = fg[2]; png.data[idx+3] = fg[3];
    }
  }
  return PNG.sync.write(png);
}

function write(file: string, buf: Buffer) {
  writeFileSync(file, buf);
  console.log('generated', file);
}

function writeJSON(file: string, obj: any) {
  writeFileSync(file, JSON.stringify(obj, null, 2));
  console.log('generated', file);
}

function main() {
  ensure(ASSETS);
  ensure(ICONS_DIR);
  ensure(IMG_DIR);

  write(join(ICONS_DIR, 'icon-192.png'), circlePng(192));
  write(join(ICONS_DIR, 'icon-512.png'), circlePng(512));

  write(join(IMG_DIR, 'player_dot.png'), playerDotPng());

  // Asset manifest used by PreloadScene
  writeJSON(join(ASSETS, 'manifest.json'), {
    images: [
      { key: 'player_dot', url: 'assets/img/player_dot.png' }
    ]
  });
}

main();
