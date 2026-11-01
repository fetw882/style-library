#!/bin/bash
# one command: bash build.sh  (node>=18, ffmpeg, Google Chrome). Formal renders run on the Mac mini.
cd "$(dirname "$0")" && bash render_mac.sh && cp test.mp4 ../test.mp4 && cp dots_5.5s.jpg ../test.jpg
