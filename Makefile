SHELL := bash

LOGO_SRC := src/assets/logo.png
BRANDING_DIR := public/assets/branding
ICONS_DIR := public/assets/icons

FULL_WIDTHS := 1024 768 512 384
FULL_LOGO_SCALES := $(addprefix $(BRANDING_DIR)/logo-full@,$(addsuffix w.png,$(FULL_WIDTHS)))

# Crop tuning for the current `src/assets/logo.png` (1536×1024):
# 1) Take the top half (removes the "Monte's DELUXE..." text)
# 2) Crop to the dice + wheel region within that top half.
MARK_CROP := 720:416:428:96
MARK_TOP_HALF := crop=iw:ih*0.50:0:0
MASKABLE_PAD_FACTOR := 1.25

BRANDING_ASSETS := \
	$(BRANDING_DIR)/logo-full.png \
	$(FULL_LOGO_SCALES) \
	$(BRANDING_DIR)/logo-mark.png \
	$(BRANDING_DIR)/logo-mark-maskable.png

ICON_ASSETS := \
	$(ICONS_DIR)/icon-192.png \
	$(ICONS_DIR)/icon-512.png \
	$(ICONS_DIR)/icon-maskable-192.png \
	$(ICONS_DIR)/icon-maskable-512.png \
	$(ICONS_DIR)/apple-touch-icon.png \
	$(ICONS_DIR)/favicon-32.png \
	$(ICONS_DIR)/favicon-16.png

.PHONY: branding-assets
branding-assets: $(BRANDING_ASSETS) $(ICON_ASSETS)

$(BRANDING_DIR) $(ICONS_DIR):
	@mkdir -p "$@"

$(BRANDING_DIR)/logo-full.png: $(LOGO_SRC) | $(BRANDING_DIR)
	@cp -f "$<" "$@"

$(BRANDING_DIR)/logo-full@%w.png: $(LOGO_SRC) | $(BRANDING_DIR)
	@ffmpeg -y -i "$<" -vf "scale=$*:-1:flags=lanczos" "$@"

$(BRANDING_DIR)/logo-mark.png: $(LOGO_SRC) | $(BRANDING_DIR)
	@ffmpeg -y -i "$<" -vf "$(MARK_TOP_HALF),crop=$(MARK_CROP),pad=max(iw\,ih):max(iw\,ih):(ow-iw)/2:(oh-ih)/2:black,scale=1024:1024:flags=lanczos" "$@"

$(BRANDING_DIR)/logo-mark-maskable.png: $(LOGO_SRC) | $(BRANDING_DIR)
	@ffmpeg -y -i "$<" -vf "$(MARK_TOP_HALF),crop=$(MARK_CROP),pad=ceil(max(iw\,ih)*$(MASKABLE_PAD_FACTOR)):ceil(max(iw\,ih)*$(MASKABLE_PAD_FACTOR)):(ow-iw)/2:(oh-ih)/2:black,scale=1024:1024:flags=lanczos" "$@"

$(ICONS_DIR)/icon-192.png: $(BRANDING_DIR)/logo-mark.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=192:192:flags=lanczos" "$@"

$(ICONS_DIR)/icon-512.png: $(BRANDING_DIR)/logo-mark.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=512:512:flags=lanczos" "$@"

$(ICONS_DIR)/icon-maskable-192.png: $(BRANDING_DIR)/logo-mark-maskable.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=192:192:flags=lanczos" "$@"

$(ICONS_DIR)/icon-maskable-512.png: $(BRANDING_DIR)/logo-mark-maskable.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=512:512:flags=lanczos" "$@"

$(ICONS_DIR)/apple-touch-icon.png: $(BRANDING_DIR)/logo-mark-maskable.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=180:180:flags=lanczos" "$@"

$(ICONS_DIR)/favicon-32.png: $(BRANDING_DIR)/logo-mark.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=32:32:flags=lanczos" "$@"

$(ICONS_DIR)/favicon-16.png: $(BRANDING_DIR)/logo-mark.png | $(ICONS_DIR)
	@ffmpeg -y -i "$<" -vf "scale=16:16:flags=lanczos" "$@"

