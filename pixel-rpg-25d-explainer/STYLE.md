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
- **Slot-wheel title**: "如果你的反应快" types in at 0.04 s per character. Then a reel window with steel rails, end caps, top/bottom fade masks and an amber selection band rolls 2倍 → 10倍 and locks in yellow with a glow. The reel furniture fades out after the lock.
- **Bullet-time beat** in three shots: setup (e.g. "苍蝇来袭 / 朋友：啪！没打中", MISS) → bullet time (tag panel "子弹时间 ×0.1 + one-line rule", top-right "现实时间 0.05秒" barely moving, yellow target ring + dashed path, hero reaches first) → result tag ("获得：苍蝇 ×1" / "一滴没洒") + the friend's "？？？".
- **Status panel**: "状态 / 反应速度 ×1 → ×10" with a filling bar and stars.
- **Choice box**: two options, a white cursor arrow, a yellow selection fill, and a countdown "剩余0.xx秒" **inside** the box at bottom-right.
- **Bet / challenge segments**: speech bubbles, a score pill ("你 1:0 朋友"), and a pay-off (the friend hands over the milk tea).
- **Replay screen**: a filled screen with a solid header bar ("回放" badge + REC dot + timecode) and "×0.1 慢放" in a corner.
- Cold-open freeze on the decision, then a pixel-mosaic transition into the title.

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
