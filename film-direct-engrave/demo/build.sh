#!/bin/bash
# One command (Mac mini): bash build.sh  -> filmscratch_v2_10s.mp4 here; needs node, ffmpeg, Google Chrome
set -euo pipefail; cd "$(dirname "$0")"
bash render_mac.sh
