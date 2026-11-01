#!/bin/bash
# 光点粒子 样片 —— Mac mini 一键正式渲染：tar xzf pack.tgz && cd pack && bash render_mac.sh
# 依赖：node ≥18、ffmpeg（brew install ffmpeg）、Google Chrome（/Applications）；首次自动装 playwright-core
set -euo pipefail; cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "need ffmpeg (brew install ffmpeg)"; exit 1; }
[ -d node_modules/playwright-core ] || npm i --no-save --no-audit --no-fund playwright-core@1 >/dev/null
rm -rf seg; WORKERS=${WORKERS:-6} node render.mjs
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/video.mp4
J=$(ffmpeg -hide_banner -i audio_8s.wav -af loudnorm=I=-14:TP=-2.0:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -v error -y -i seg/video.mp4 -i audio_8s.wav -map 0:v -map 1:a -t 8.0 \
 -af "loudnorm=I=-14:TP=-2.0:LRA=7:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
 -c:v libx264 -crf 18 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -c:a aac -b:a 192k -movflags +faststart test.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name,color_space -of compact test.mp4
ffmpeg -hide_banner -i test.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "done: $(pwd)/test.mp4 + dots_{2.6,5.5,6.8}s.jpg"
