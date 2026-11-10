# Changes — Pixel RPG 2.5D Explainer 像素RPG 2.5D 科普 (base: Lemo official pixel-rpg)

| Section | Base (official pixel-rpg) | Now | Why |
|---|---|---|---|
| 1 Essence | 16-bit RPG game-trailer storytelling | second-person "what if" explainer; UI explains, scenes act it out | Ifverse adaptation《如果你的反应快10倍》 |
| 2 Stage | pixel layers | the same layers on z-depths in Three.js 2.5D (WebGPU), parallax, camera moves | depth + camera grammar |
| 2 Resolution | 未提供 | native 640×360 → integer ×3 nearest to 1920×1080, 24 fps | crisp pixels, no sub-pixel text |
| 4 Type | 未提供 | Fusion Pixel 12px (OFL), whole characters only; short labels / quotes pop whole; sizes 180/144/72/36 | v4–v7 review: half-typed words read as truncated |
| 4 Panels | RPG boxes | panel opens 3× faster, text only when fully open; timer inside the choice box | v6/v7 review: empty frames, timer touching the edge |
| 5 Motion | 未提供 | irritation = hard cuts every 0.7–1.5 s with small hero actions | v6 cinema review |
| 6 Camera | 未提供 | push/pan + hard cuts; characters ≥24 px from the edge; never cover faces | v6/v7 review |
| 7 Sound | 未提供 | Fish drama-3 narration (no whisper), CC0 SFX, four-layer BGM analysis, −14 LUFS | house standard + user rules |
| 8 Moves | save-point flashback | slot-wheel title, bullet-time beat with a real-time clock, status panel, choice box, bet segments, replay screen | built for this film, kept as invariants |
| 10 Engine | 未提供 | Playwright + headless Chrome WebGPU → ffmpeg; per-frame text/edge scanner | production pipeline (source since deleted) |
