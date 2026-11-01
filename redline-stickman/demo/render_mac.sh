#!/bin/bash
# 红线火柴人 v2 —— Mac mini 正式渲染：tar xzf pack.tgz && cd pack && bash render_mac.sh
# audio_mix.wav 已在盒子上混好（对白 Fish Drama 3 + 合成 BGM，−14 LUFS），这里只做画面+封装
set -euo pipefail; cd "$(dirname "$0")"
[ -d node_modules/playwright-core ] || npm i --no-save --no-audit --no-fund playwright-core@1 >/dev/null
rm -rf seg; WORKERS=${WORKERS:-8} node render.mjs
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/video.mp4
ffmpeg -v error -y -i seg/video.mp4 -i audio_mix.wav -map 0:v -map 1:a -t 9.14 -c:v libx264 -crf 18 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -c:a aac -b:a 256k -movflags +faststart test.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name,color_space -of compact test.mp4
ffmpeg -hide_banner -i test.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
