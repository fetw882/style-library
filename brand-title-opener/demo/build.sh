#!/bin/bash
# newbeer.lee 厂牌滚轮片头 v3：一键渲出两条无 BGM 样片（仅合成音效）并拼成 test.mp4。
# 默认不接任何 BGM。配乐要在成片里另混，且必须先有授权证明。
# 依赖：Python 3 + numpy + playwright（Chromium/Chrome，默认 /usr/bin/google-chrome）、ffmpeg。
# 字体：fonts/ 下 5 个 OFL 字体（见 FONTS.md）；公开站不含字体文件，按 FONTS.md 的来源下载后放进 fonts/。
# 用法：bash build.sh [输出目录]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="${1:-$PWD/brand_opener_out}"; mkdir -p "$OUT"
cd "$HERE"
# 数字例：主题词 10倍，反差词 1倍（默认规则推出，可不写 --contrast）
python3 render.py --prefix 如果你的反应快 --values "2倍,3倍,4倍,5倍,6倍,7倍,8倍,9倍,10倍" --contrast 1倍 \
  --drop 3.3 --skin pixel --aspect 16:9 --out "$OUT/number_pixel_16x9.mp4"
# 词例：主题词 暂停，反差词 加速，后缀 时间
python3 render.py --prefix 如果你能 --values "加速,倒流,跳过,复制,暂停" --contrast 加速 --suffix 时间 \
  --drop 3.3 --skin data --aspect 16:9 --out "$OUT/word_data_16x9.mp4"
# 拼接：先数字例，后词例（与库里 test.mp4 同法）
ffmpeg -nostdin -loglevel error -y -i "$OUT/number_pixel_16x9.mp4" -i "$OUT/word_data_16x9.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/test.mp4"
echo "done -> $OUT"
