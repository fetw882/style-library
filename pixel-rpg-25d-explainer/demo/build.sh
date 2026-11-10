#!/bin/bash
# Rebuild the 5 cover ratios (only the cover generator survives; the film render source was deleted at the owner's request).
# Needs: Python 3 + Pillow; Fusion Pixel 12px proportional zh_hans TTF (OFL, https://github.com/TakWolf/fusion-pixel-font);
#        the approved cover B image (its game-frame band y 470..993 is reused; not stored in this library).
# Usage: FONT=/path/fusion-pixel-12px-proportional-zh_hans.ttf COVER_B=/path/cover_B_3x4.jpg bash build.sh [outdir]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="${1:-$PWD/covers_out}"
: "${FONT:?set FONT}"; : "${COVER_B:?set COVER_B}"
W=$(mktemp -d); mkdir -p "$W/art/fonts" "$W/covers_v7"
ln -s "$FONT" "$W/art/fonts/fusion-pixel-12px-proportional-zh_hans.ttf"; ln -s "$COVER_B" "$W/cover_B_3x4.jpg"
(cd "$W" && python3 "$HERE/make_covers_v7.py")
mkdir -p "$OUT"; cp "$W"/covers_v7/* "$OUT"/; rm -rf "$W"; echo "covers -> $OUT"
