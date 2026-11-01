# Demo（v2）
demo/index.html 里有 render(t) 纯函数。timing.js 是生成的，包含关键词起点 K、字幕 CAP 和嘴型包络 ENV。
渲染：在 demo/ 下准备好 node_modules（playwright-core），再放入自己的 audio_mix.wav（公开目录不提供音频），然后运行 `bash render_mac.sh`。
关键帧：1.3 / 3.2 / 5.2 / 7.7 s。公开 test.mp4 是静音版（-an）。
