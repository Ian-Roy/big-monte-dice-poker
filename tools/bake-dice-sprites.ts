/**
 * Bake 2D face sprites from the Dice-Box default theme so Vue lock/score rows
 * reuse the same pips/spacing. Outputs both to public/ (for the app) and src/
 * (for Vite imports):
 *  - .../dice-box/faces.png (sprite strip 1–6)
 *  - .../dice-box/faces.json (metadata)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const OUT_DIRS = [join('public', 'assets', 'dice-box'), join('src', 'assets', 'dice-box')];
const SPRITE_NAME = 'faces.png';
const META_NAME = 'faces.json';

const SIZE = 88;
const GAP = 6;
const PAD = 6;
const THEME_DIFFUSE = join('public', 'assets', 'dice-box', 'themes', 'default', 'diffuse-light.png');

type Frame = { x: number; y: number; w: number; h: number };

function rgba(hex: number) {
  return {
    r: (hex >> 24) & 0xff,
    g: (hex >> 16) & 0xff,
    b: (hex >> 8) & 0xff,
    a: hex & 0xff
  };
}

function loadThemeDiffuse() {
  const buf = readFileSync(THEME_DIFFUSE);
  return PNG.sync.read(buf);
}

function detectBaseAndPipColor(png: PNG) {
  const counts: Record<string, number> = {};
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const a = png.data[idx + 3];
      const r = png.data[idx + 0];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const key = `${r},${g},${b},${a}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [baseKey] = sorted[0];
  const [r, g, b] = baseKey.split(',').map((v) => parseInt(v, 10));
  const base = { r, g, b, a: 255 };

  // Pip color: pick the brightest non-transparent pixel
  const bright = sorted
    .map(([key]) => key.split(',').map((v) => parseInt(v, 10)) as number[])
    .filter(([, , , a]) => a > 0)
    .sort((a1, a2) => {
      const l1 = a1[0] + a1[1] + a1[2];
      const l2 = a2[0] + a2[1] + a2[2];
      return l2 - l1;
    });
  const [pr = 255, pg = 255, pb = 255] = bright[0] ?? [255, 255, 255, 255];
  const pip = { r: pr, g: pg, b: pb, a: 255 };

  return { base, pip };
}

function findFaces(png: PNG) {
  const faces: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  const cols: number[] = [];
  for (let x = 0; x < png.width; x++) {
    let hasAlpha = false;
    for (let y = 0; y < png.height; y++) {
      const idx = (png.width * y + x) << 2;
      if (png.data[idx + 3] > 0) {
        hasAlpha = true;
        break;
      }
    }
    if (hasAlpha) cols.push(x);
  }

  if (!cols.length) return faces;
  let start = cols[0];
  let prev = cols[0];
  const xGroups: Array<[number, number]> = [];
  for (const x of cols.slice(1)) {
    if (x === prev + 1) {
      prev = x;
    } else {
      xGroups.push([start, prev]);
      start = x;
      prev = x;
    }
  }
  xGroups.push([start, prev]);

  // Filter tiny slivers; we expect six groups for d6 faces.
  const filtered = xGroups.filter(([a, b]) => b - a > 10).slice(0, 6);

  filtered.forEach(([x0, x1]) => {
    const ys: number[] = [];
    for (let y = 0; y < png.height; y++) {
      let hasAlpha = false;
      for (let x = x0; x <= x1; x++) {
        const idx = (png.width * y + x) << 2;
        if (png.data[idx + 3] > 0) {
          hasAlpha = true;
          break;
        }
      }
      if (hasAlpha) ys.push(y);
    }
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    faces.push({ x0, x1, y0, y1 });
  });

  return faces;
}

function compositeFace(base: ReturnType<typeof rgba>, pip: ReturnType<typeof rgba>, value: number) {
  const out = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      setPixel(out, x, y, base);
    }
  }
  const center = SIZE / 2;
  const offset = Math.floor(SIZE * 0.22);
  const pipRadius = 7;
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
    fillCircle(out, center + x, center + y, pipRadius, pip);
  });

  return out;
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
  const diffuse = loadThemeDiffuse();
  const { base, pip } = detectBaseAndPipColor(diffuse);

  const frames: Record<string, Frame> = {};
  const stripWidth = SIZE * 6 + GAP * 5;
  const strip = new PNG({ width: stripWidth, height: SIZE });

  for (let i = 0; i < 6; i++) {
    const facePng = compositeFace(base, pip, i + 1);
    const xOffset = i * (SIZE + GAP);
    PNG.bitblt(facePng, strip, 0, 0, SIZE, SIZE, xOffset, 0);
    frames[`die-face-${i + 1}.png`] = { x: xOffset, y: 0, w: SIZE, h: SIZE };
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
