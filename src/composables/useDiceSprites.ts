import facesMeta from '../shared/diceFacesMeta';

export type DiceFaceFrame = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function useDiceSprites() {
  const meta = facesMeta as {
    frames: Record<string, { x: number; y: number; w: number; h: number }>;
    meta?: { size?: { w: number; h: number } };
  };
  const url = new URL('../assets/dice-box/faces.png', import.meta.url).href;

  const byValue: Record<number, DiceFaceFrame> = {};
  Object.entries(meta.frames).forEach(([key, frame]) => {
    const match = key.match(/die-face-(\d)/);
    if (!match) return;
    const value = Number(match[1]);
    byValue[value] = { key, ...frame };
  });

  const sheetSize = {
    w: meta.meta?.size?.w ?? 0,
    h: meta.meta?.size?.h ?? 0
  };

  return { url, frames: byValue, sheetSize };
}
