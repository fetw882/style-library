# Pixel RPG 2.5D Explainer 像素RPG 2.5D 科普 — Style Prompt

> A "what if you…" explainer told like a 16-bit RPG: pixel characters act it out on a 2.5D stage, the game UI does the explaining.
> Source: our own finished film《如果你的反应快10倍》v7 (2026-11-10). Story adapted from Ifverse (https://www.youtube.com/watch?v=MroF1XmHOZw), adaptation reference only. Never reuse its footage, frames or shots.

## 1. Essence, and what it is not
Second-person hypothetical science told as a game. "You" are a chibi pixel hero. Every claim is **acted out as a scene**, and **RPG UI** spells out the point: status panels, dialogue boxes, choice boxes, tag panels. Slow motion is shown as "bullet time": the world crawls while a real-time clock barely moves.

Not: a retro filter over footage. Not a flat 2D slideshow (the layers sit at different depths and the camera moves through them). Not a game trailer (there's no gameplay loop; the UI exists to explain). Not chiptune-only (the narration leads).

## 2. Materials & rendering
- Pixel layers (sprites, tiles, UI) from the Lemo official **pixel-rpg** set, placed on z-layers in a **Three.js 2.5D (WebGPU)** scene: foreground / middle ground / background parallax.
- Native canvas **640×360**, upscaled with **integer ×3 nearest-neighbour** to 1920×1080. No smoothing, no sub-pixel text.
- Characters: parametric chibi rig (lean, reach, crouch, expressions), with thick dark outlines.
- Post: greyscale "freeze" that keeps colour only on the hero layer (used for decision moments); light grain.

## 3. Colour logic
- Palette: ENDESGA-32 (as recorded in the kickoff notes).
- UI: dark navy panels with a cyan edge. Yellow is reserved for the key number or the chosen option (the "10倍", the selected choice, the bullet-time target). Amber marks warnings and results; red marks "回放", REC and danger.
- In decision moments the world turns grey and the hero stays in colour.

## 4. Type & subtitles
- Font **Fusion Pixel 12px** (OFL), drawn on its native grid and upscaled by integers only.
- Size floors @1080: title 180 px (×5), choice / key words 144 px (×4), big numbers 144 px, subtitles and panel text 72 px (×2), labels 36 px (×1).
- **Text appears as whole characters only.** Short labels, card lines and quotes **pop in whole** (a half-typed short word reads as cut off). Long subtitles may chunk in.
- A panel opens first (fast, about 0.1 s), then its text. Never show an empty box or a lone quote mark.
- Subtitles: white with a dark outline, bottom centre, chunked by clause, never over the action.

## 5. Motion quality
- Every frame is a pure function of t (single clock, seeded randomness).
- Big actions get anticipation and settle; impacts get a shake and stars.
- Irritation and boredom are shown by **hard cuts every 0.7–1.5 s** between small hero actions (yawn, anger mark, fidget scribble), not by one long held shot.
- Keep ≤3 moving regions and no uniform motion longer than 0.5 s (the self-check still flags about 3% of frames).

## 6. Camera grammar
- Push-ins and slow pans on camPath keys; hard cuts between ideas; close-ups for "friend 0.25秒 / you 0.025秒" comparisons.
- High shot → hard cut to a low shot when a falling object must read clearly against a character (keep a visible gap; never cover a face).
- Characters stay ≥24 px (1080p) from the frame edge. A ≤0.2 s pan entry is tolerated.

## 7. Sound palette
- Fish Audio drama-3 narration, normal volume and clear voice (**no whispering or lowered voice**).
- CC0 Freesound SFX on every UI action: typing ticks, wheel ticks, panel pop, slam, cheer, "叮" for a reward.
- The BGM's four layers (low / rhythm / melody / ambience) were analysed and drive four visual layers.
- Mix −14 LUFS integrated, true peak ≈ −1.4 dBFS.

## 8. Native moves
- **Slot-wheel title**: "如果你的反应快" types in at 0.04 s per character. Then a reel window with steel rails, end caps, top/bottom fade masks and an amber selection band rolls 2倍 → 10倍 and locks in yellow with a glow. The reel furniture fades out after the lock. Full timing/visual spec: see the section below and `TITLE_ANIMATION.md`（逐字整字弹出每字0.04s+打字声 → 「快」打完后 2.05–3.08s 减速滚动 2倍→10倍、相邻行淡出、8声滚轮tick → 3.08–3.30s 过冲回弹吸附 → 3.30s 卡音乐drop锁定变黄发光，主标题≈180px、副标题≈108px）.
- **Bullet-time beat** in three shots: setup (e.g. "苍蝇来袭 / 朋友：啪！没打中", MISS) → bullet time (tag panel "子弹时间 ×0.1 + one-line rule", top-right "现实时间 0.05秒" barely moving, yellow target ring + dashed path, hero reaches first) → result tag ("获得：苍蝇 ×1" / "一滴没洒") + the friend's "？？？".
- **Status panel**: "状态 / 反应速度 ×1 → ×10" with a filling bar and stars.
- **Choice box**: two options, a white cursor arrow, a yellow selection fill, and a countdown "剩余0.xx秒" **inside** the box at bottom-right.
- **Bet / challenge segments**: speech bubbles, a score pill ("你 1:0 朋友"), and a pay-off (the friend hands over the milk tea).
- **Replay screen**: a filled screen with a solid header bar ("回放" badge + REC dot + timecode) and "×0.1 慢放" in a corner.
- Cold-open freeze on the decision, then a pixel-mosaic transition into the title.

### 开头标题出现动画（滚轮标题）——设计规范

来源：用户给的参考图方案（逐字打出 + iOS 式滚轮滚到「10倍」），v7 定稿实际做法。以下数值取自 v3–v7 制作记录；渲染源码已删除，只能按本文重做。

#### 时间线（片内绝对时间，24fps）
| 时间 | 发生什么 | 声音 |
|---|---|---|
| 0–约1.8 s | 冷开场：决定瞬间定格 + 选择框（钩子），像素马赛克转场进标题 | — |
| 约1.0–2.0 s | 「如果你的反应快」逐字出现，每字 0.04 s；每个字**整字弹出**（不渐显、不出半个字），每字一声打字「咔」 | 打字 tick |
| 2.05 s | 「快」字必须已经打完，滚轮才开始 | — |
| 2.05–3.08 s | 滚轮从 2倍 往上滚到 10倍：先快后慢（减速缓动），相邻上下两行数字可见并逐渐淡出，每过一格一声「嗒」，全程约 8 声 | 滚轮 tick ×8 |
| 3.08–3.30 s | 惯性过冲一点再回弹吸附（snap）到 10倍 | 最后一声 tick |
| 3.30 s | 锁定：正好卡在音乐 drop 上；「10倍」变黄并发光；滚轮外框淡出 | drop |
| 之后 | 副标题出现 | — |

#### 视觉构成
- 字体：Fusion Pixel 12px（OFL），整数倍放大，不做亚像素平滑。
- 主标题字号约 180 px（1080p 下），白字 + 深色投影；副标题约 108 px，白色。
- 「10倍」锁定后：黄色 + 外发光，居中偏大。
- 滚轮外框：钢质导轨（左右 rails）+ 上下端盖 + 上下渐隐遮罩 + 琥珀色选中带；相邻行用遮罩淡出，不能缩成看不清的小字。
- 锁定后滚轮外框淡出，只留下标题文字。

#### 验收（每次必须逐帧核对）
1. 抽 2.0–3.4 s 每帧拼图，能看到数字是**一格一格连续滚上来**，不是一帧跳一个数。
2. 滚动时间 ≥ 1 s，有减速，有过冲回弹。
3. 「快」字打完前滚轮不能动；任何一帧不能出现半个字或残留符号。
4. 锁定帧落在音乐 drop 上（误差 ≤ 1 帧）。
5. 找不知情的观看者盲看，确认能说出「10倍是滚出来的」。

#### 踩过的坑
- v2：一帧跳一个数字、0.45 s 就滚完，相邻行太小 → 观众看不出在滚动（用户退回）。
- v4：标题下面残留小符号；字是渐显的，会出现半个字 → v5 改成整字弹出。

## 9. Pitfalls of the medium
- A half-typed short label ("只有1", "只掉3") reads as truncated: pop it whole.
- An empty or thin panel frame reads as a glitch: gate the text on the panel being fully open.
- A cropped prop reads as UI (a half movie car read as a "progress bar"): draw it only when it's whole in frame, or cut it.
- Colour-noise strips between badges read as an empty box: use solid bars.
- A timer pressed against a box edge: put it inside the box.
- A falling object over a face, or characters touching the frame edge.
- Character legs merging into a dark car body / subtitle band: stand the character on visible ground with a shadow, above the subtitle zone.
- Code: never leave a trailing `//` comment mid-line in generated code; run `node --check` every time.

## 10. Engine
- Three.js (WebGPU) 2.5D stage with Lemo official pixel-rpg layers. The render page exposes `render(t)`; Playwright drives headless Chrome (SwiftShader WebGPU on the box), and frames are piped to **ffmpeg** (H.264 yuv420p bt709 tv, CRF18, faststart; 720p preview ~750 kbps).
- QA: a per-frame text scanner (overlap / cut / text-over-panel / empty panel / character edge), a motion verifier with four-layer ablation renders, and loudness checks.
- **The render source of the reference film was deleted at the owner's request (2026-11-10).** Only the cover generator survives (demo/).

## 11. Variation space / known gaps
- The motion self-check never reached 90 (71.25: static holds, breath bars, layer-timing misses). Next film: design breath bars and layer entries into the timeline from the start.
- BGM licence: use a track with licence proof so the public version can have sound.
- Topics: any "what if you were 10× faster / stronger / smaller…" hypothetical, reaction / speed / perception explainers.
- 未提供: a vertical 9:16 version of the stage, and tested durations other than about 2 min.
- Later brand title openers follow the separate entry `brand-title-opener` (contrast pick, then spin back to the theme word; the theme word can be a word, not only a number). This film's own v7 title history above is unchanged.
