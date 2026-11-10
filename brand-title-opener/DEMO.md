# Demo — Brand Title Opener 厂牌滚轮片头

只是例子；换片子时换前半句、词表、主题词、反差词、D 和皮肤，动作和时间规则不变（见 STYLE.md）。

- **test.mp4**（960×540，30 fps，10.2 s，**无 BGM，仅合成音效**；公开站再剥掉音轨）= 两条拼接：
  1. 数字例（0–5.1 s，pixel 皮肤）：如果你的反应快 2倍→…→**10倍**（经过不停）→ 反差 **1倍** 停稳 → 旋回 → 锁定 **10倍**。
  2. 词例（5.1–10.2 s，data 皮肤）：如果你能 加速→倒流→跳过→复制→**暂停**（经过不停）→ 反差 **加速** 停稳 → 旋回 → 锁定 **暂停** + 后缀「时间」。
  两条都没有拍点表，按 112.7 BPM 从 D=3.30 s 倒推出字；锁定都在 f99。
- **test.jpg**：四宫格，左列 = 反差停顿（1倍 / 加速），右列 = 锁定定格（10倍 / 暂停时间），上行数字例、下行词例。
- **styleframe.jpg**：词例锁定后定格（如果你能**暂停**时间，主题词已变黄）。

## 一键重渲（本地库 demo/）
```bash
cd demo && bash build.sh /tmp/brand_opener_out     # 默认不接 BGM
```
单条：
```bash
# 数字例
python3 render.py --prefix 如果你的反应快 --values 2倍,3倍,4倍,5倍,6倍,7倍,8倍,9倍,10倍 --contrast 1倍 --drop 3.3 --skin pixel --aspect 16:9 --out num.mp4
# 词例
python3 render.py --prefix 如果你能 --values 加速,倒流,跳过,复制,暂停 --contrast 加速 --suffix 时间 --drop 3.3 --skin data --aspect 16:9 --out word.mp4
# 数字便利写法（与上面数字例等价）：--from 2 --to 10 --unit 倍
# 有歌的拍点表时：--beats beats.json --beats-drop <歌里 drop 秒数>
```
- 公开站只有 demo/ 下的 .js/.html/.sh/.md/.json；render.py、sfx.py 与字体文件只在本地库。字体来源见 demo/FONTS.md（全部 OFL）。
- 两条样片在源工作目录的自审（23 项）全部通过。
- 内审用过的样片（配 We Never）没有授权证明，不在本库、不对外。
