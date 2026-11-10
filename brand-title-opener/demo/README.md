# demo/ — 厂牌滚轮片头引擎（v3）
- opener.html / opener.js / skins.js：引擎（Canvas 2D，frame(i) 为 t 的纯函数）。不变量全部在 opener.js 的 `C`。
- render.py：一条命令出片（库内精简版，**不接 BGM**）。sfx.py：音效合成。build.sh：数字例 + 词例 → test.mp4。
- fonts/：OFL 字体（只在本地库，公开站不发），来源见 FONTS.md。
- 主题词 = `--values` 末项，数字或词同等；`--contrast` 反差词（不传按默认规则）。
