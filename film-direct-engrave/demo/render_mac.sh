#!/bin/bash
# 一键：tar xzf pack.tgz && cd pack && bash render_mac.sh
set -euo pipefail; cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "need ffmpeg (brew install ffmpeg)"; exit 1; }
[ -d node_modules/playwright-core ] || npm i --no-save --no-audit --no-fund playwright-core@1 >/dev/null
rm -rf seg; node render.mjs
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/video.mp4
# audio: loudnorm 2-pass to -14 LUFS / TP -1.5
J=$(ffmpeg -hide_banner -i audio_10s.wav -af loudnorm=I=-14:TP=-2.0:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -v error -y -i seg/video.mp4 -i audio_10s.wav -map 0:v -map 1:a -t 10.0 \
 -af "loudnorm=I=-14:TP=-2.0:LRA=7:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,afade=t=out:st=9.7:d=0.3,aresample=48000" \
 -c:v copy -c:a aac -b:a 192k -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart filmscratch_v2_10s.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name -of compact filmscratch_v2_10s.mp4
ffmpeg -hide_banner -i filmscratch_v2_10s.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "done: $(pwd)/filmscratch_v2_10s.mp4 + filmscratch_v2_{2.6,5.8,9.6}s.jpg"
