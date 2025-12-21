# Branding assets (logo + PWA icons)

This project commits all branding images as static assets. They are not regenerated during builds.

## Source file

- `src/assets/logo.png`

## Generated (committed) outputs

Branding (UI):
- `public/assets/branding/logo-full.png`
- `public/assets/branding/logo-full@1024w.png`
- `public/assets/branding/logo-full@768w.png`
- `public/assets/branding/logo-full@512w.png`
- `public/assets/branding/logo-full@384w.png`
- `public/assets/branding/logo-mark.png` (dice + wheel mark, square)
- `public/assets/branding/logo-mark-maskable.png` (dice + wheel mark with extra padding for maskable icons)

Icons:
- `public/assets/icons/icon-192.png`
- `public/assets/icons/icon-512.png`
- `public/assets/icons/icon-maskable-192.png`
- `public/assets/icons/icon-maskable-512.png`
- `public/assets/icons/apple-touch-icon.png`
- `public/assets/icons/favicon-32.png`
- `public/assets/icons/favicon-16.png`

## Regenerating assets

Prereqs:
- `ffmpeg` on PATH

Run:

```bash
make branding-assets
```

Then commit the updated PNGs.

## How the “mark” crop works

The PWA icon uses a cropped “dice + wheel” mark derived from `src/assets/logo.png`.

Current pipeline:
1. Crop to the **top half** of the source image (removes the title text).
2. Crop a tuned rectangle around the dice + wheel.
3. Pad to a square and scale to 1024×1024.
4. Scale down to the required icon sizes.

The exact crop box is defined in `Makefile:1` as `MARK_CROP`. If the source logo changes, you may need to retune this rectangle.

Maskable icons:
- “Maskable” icons are padded (see `MASKABLE_PAD_FACTOR` in `Makefile:1`) so Android launchers can apply their own shape without clipping the artwork.

## Where these assets are wired up

- Title screens load the full logo from `public/assets/branding/`:
  - `src/pages/TitlePage.vue:1`
  - `src/components/ui/TitleScreen.vue:1`
- PWA manifest icons are declared in `vite.config.ts:1`.
- Favicons / Apple touch icon links live in `index.html:1`.

