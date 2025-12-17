export type RGB = { r: number; g: number; b: number };

function clamp255(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseHexColor(input: unknown): RGB | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

export function rgbToHex(rgb: RGB) {
  const toHex = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgba(hex: unknown, alpha: number) {
  const rgb = parseHexColor(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const tt = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * tt,
    g: a.g + (b.g - a.g) * tt,
    b: a.b + (b.b - a.b) * tt
  };
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(rgb: RGB) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function brightenHex(hex: string, strength = 0.35) {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const white: RGB = { r: 255, g: 255, b: 255 };
  return rgbToHex(mix(rgb, white, strength));
}

export function ensureBrighterHex(hex: string, minDelta = 0.08) {
  const base = parseHexColor(hex);
  if (!base) return hex;
  const baseLum = luminance(base);
  let t = 0.25;
  let out = base;
  for (let i = 0; i < 8; i += 1) {
    const candidate = parseHexColor(brightenHex(hex, t));
    if (!candidate) break;
    if (luminance(candidate) >= baseLum + minDelta) {
      out = candidate;
      break;
    }
    out = candidate;
    t = Math.min(1, t + 0.15);
  }
  return rgbToHex(out);
}

export function ensureBrighterThanHex(hex: string, baselineHex: string, minDelta = 0.08) {
  const baseline = parseHexColor(baselineHex);
  if (!baseline) return ensureBrighterHex(hex, minDelta);
  const baselineLum = luminance(baseline);

  const base = parseHexColor(hex);
  if (!base) return hex;

  let t = 0.2;
  let out = base;
  for (let i = 0; i < 10; i += 1) {
    const candidate = parseHexColor(brightenHex(hex, t));
    if (!candidate) break;
    const lum = luminance(candidate);
    out = candidate;
    if (lum >= baselineLum + minDelta) break;
    t = Math.min(1, t + 0.12);
  }
  return rgbToHex(out);
}
