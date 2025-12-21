## Branding assets

Quick regen:

- `make branding-assets` (see `docs/branding-assets.md`)

Place the source logo image at:

- `src/assets/logo.png` (source)

Generated assets (committed):

- `public/assets/branding/logo-full.png` (full logo)
- `public/assets/branding/logo-full@1024w.png`
- `public/assets/branding/logo-full@768w.png`
- `public/assets/branding/logo-full@512w.png`
- `public/assets/branding/logo-full@384w.png`
- `public/assets/branding/logo-mark.png` (dice + wheel mark, 1024×1024)
- `public/assets/branding/logo-mark-maskable.png` (dice + wheel mark, padded for maskable icons)
- `public/assets/icons/icon-192.png` (PWA icon)
- `public/assets/icons/icon-512.png` (PWA icon)
- `public/assets/icons/icon-maskable-192.png` (PWA maskable icon)
- `public/assets/icons/icon-maskable-512.png` (PWA maskable icon)
- `public/assets/icons/apple-touch-icon.png` (iOS home screen icon, 180×180)
- `public/assets/icons/favicon-32.png`
- `public/assets/icons/favicon-16.png`

If you replace the source logo, re-run these commands and commit the updated PNGs:

```bash
# Full logo (copy + responsive sizes)
cp -f src/assets/logo.png public/assets/branding/logo-full.png
ffmpeg -y -i src/assets/logo.png -vf "scale=1024:-1:flags=lanczos" public/assets/branding/logo-full@1024w.png
ffmpeg -y -i src/assets/logo.png -vf "scale=768:-1:flags=lanczos" public/assets/branding/logo-full@768w.png
ffmpeg -y -i src/assets/logo.png -vf "scale=512:-1:flags=lanczos" public/assets/branding/logo-full@512w.png
ffmpeg -y -i src/assets/logo.png -vf "scale=384:-1:flags=lanczos" public/assets/branding/logo-full@384w.png

# Mark (dice + wheel) from the top-half of the source image.
# The second crop box is tuned to the current logo; adjust if the source changes.
ffmpeg -y -i src/assets/logo.png -vf "crop=iw:ih*0.50:0:0,crop=720:416:428:96,pad=max(iw\,ih):max(iw\,ih):(ow-iw)/2:(oh-ih)/2:black,scale=1024:1024:flags=lanczos" public/assets/branding/logo-mark.png
ffmpeg -y -i src/assets/logo.png -vf "crop=iw:ih*0.50:0:0,crop=720:416:428:96,pad=ceil(max(iw\,ih)*1.25):ceil(max(iw\,ih)*1.25):(ow-iw)/2:(oh-ih)/2:black,scale=1024:1024:flags=lanczos" public/assets/branding/logo-mark-maskable.png

# PWA icons
ffmpeg -y -i public/assets/branding/logo-mark.png -vf "scale=192:192:flags=lanczos" public/assets/icons/icon-192.png
ffmpeg -y -i public/assets/branding/logo-mark.png -vf "scale=512:512:flags=lanczos" public/assets/icons/icon-512.png
ffmpeg -y -i public/assets/branding/logo-mark-maskable.png -vf "scale=192:192:flags=lanczos" public/assets/icons/icon-maskable-192.png
ffmpeg -y -i public/assets/branding/logo-mark-maskable.png -vf "scale=512:512:flags=lanczos" public/assets/icons/icon-maskable-512.png

# Favicons + iOS home screen icon
ffmpeg -y -i public/assets/branding/logo-mark-maskable.png -vf "scale=180:180:flags=lanczos" public/assets/icons/apple-touch-icon.png
ffmpeg -y -i public/assets/branding/logo-mark.png -vf "scale=32:32:flags=lanczos" public/assets/icons/favicon-32.png
ffmpeg -y -i public/assets/branding/logo-mark.png -vf "scale=16:16:flags=lanczos" public/assets/icons/favicon-16.png
```
