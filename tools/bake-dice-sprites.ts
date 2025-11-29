/**
 * Bake 2D face sprites from the Dice-Box default theme so Vue lock/score rows
 * can reuse the same visuals. Outputs:
 *  - public/assets/dice-box/faces.png (sprite strip 1–6)
 *  - public/assets/dice-box/faces.json (metadata)
 *
 * This runs in Node/ts-node; no browser globals. Dice-Box uses Three.js under
 * the hood, which supports offscreen rendering via Node's canvas if env is set.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const OUT_DIRS = [join('public', 'assets', 'dice-box'), join('src', 'assets', 'dice-box')];
const SPRITE_NAME = 'faces.png';
const META_NAME = 'faces.json';

// Borrow the same colors used in the Phaser fallback for now; later we can
// substitute actual Dice-Box textures when a headless render path is available.
const FACE_BG = 0x1b2c3dff;
const FACE_STROKE = 0x7ad3ffff;
const PIP = 0xffffffff;
const SIZE = 88;
const GAP = 6;

type Frame = { x: number; y: number; w: number; h: number };

function rgba(hex: number) {
  return {
    r: (hex >> 24) & 0xff,
    g: (hex >> 16) & 0xff,
    b: (hex >> 8) & 0xff,
    a: hex & 0xff
  };
}

function drawFace(value: number) {
  const png = new PNG({ width: SIZE, height: SIZE });
  const bg = rgba(FACE_BG);
  const stroke = rgba(FACE_STROKE);
  const pip = rgba(PIP);
  const radius = 14;
  const strokeWidth = 4;
  const center = SIZE / 2;
  const offset = Math.floor(SIZE * 0.24);
  const pipRadius = 7;

  // Fill background
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      setPixel(png, x, y, bg);
    }
  }

  // Stroke border (simple square with rounded-ish corners)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = Math.min(x, SIZE - 1 - x);
      const dy = Math.min(y, SIZE - 1 - y);
      const d = Math.min(dx, dy);
      if (d < strokeWidth || d < radius) {
        setPixel(png, x, y, stroke);
      }
    }
  }

  const pips: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 0, y: 0 }],
    2: [
      { x: -offset, y: -offset },
      { x: offset, y: offset }
    ],
    3: [
      { x: -offset, y: -offset },
      { x: 0, y: 0 },
      { x: offset, y: offset }
    ],
    4: [
      { x: -offset, y: -offset },
      { x: offset, y: -offset },
      { x: -offset, y: offset },
      { x: offset, y: offset }
    ],
    5: [
      { x: -offset, y: -offset },
      { x: offset, y: -offset },
      { x: 0, y: 0 },
      { x: -offset, y: offset },
      { x: offset, y: offset }
    ],
    6: [
      { x: -offset, y: -offset },
      { x: offset, y: -offset },
      { x: -offset, y: 0 },
      { x: offset, y: 0 },
      { x: -offset, y: offset },
      { x: offset, y: offset }
    ]
  };

  pips[value]?.forEach(({ x, y }) => {
    fillCircle(png, center + x, center + y, pipRadius, pip);
  });

  return PNG.sync.write(png);
}

function setPixel(png: PNG, x: number, y: number, c: { r: number; g: number; b: number; a: number }) {
  const idx = (png.width * y + x) << 2;
  png.data[idx + 0] = c.r;
  png.data[idx + 1] = c.g;
  png.data[idx + 2] = c.b;
  png.data[idx + 3] = c.a;
}

function fillCircle(
  png: PNG,
  cx: number,
  cy: number,
  r: number,
  c: { r: number; g: number; b: number; a: number }
) {
  for (let y = Math.max(0, cy - r); y <= Math.min(png.height - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(png.width - 1, cx + r); x++) {
      if (Math.hypot(x - cx, y - cy) <= r) {
        setPixel(png, x, y, c);
      }
    }
  }
}

function bake() {
  const frames: Record<string, Frame> = {};
  const stripWidth = SIZE * 6 + GAP * 5;
  const strip = new PNG({ width: stripWidth, height: SIZE });

  for (let i = 1; i <= 6; i++) {
    const buf = drawFace(i);
    const face = PNG.sync.read(buf);
    const xOffset = (i - 1) * (SIZE + GAP);

    PNG.bitblt(face, strip, 0, 0, SIZE, SIZE, xOffset, 0);
    frames[`die-face-${i}.png`] = { x: xOffset, y: 0, w: SIZE, h: SIZE };
  }

  const spriteBuf = PNG.sync.write(strip);
  const metaJson = JSON.stringify(
    {
      image: SPRITE_NAME,
      frames,
      meta: {
        size: { w: stripWidth, h: SIZE },
        generatedAt: new Date().toISOString()
      }
    },
    null,
    2
  );

  OUT_DIRS.forEach((dir) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, SPRITE_NAME), spriteBuf);
    writeFileSync(join(dir, META_NAME), metaJson);
    console.log(`Wrote ${join(dir, SPRITE_NAME)} and ${join(dir, META_NAME)}`);
  });
}

bake();
