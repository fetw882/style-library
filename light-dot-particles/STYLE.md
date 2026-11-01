# 光点粒子 Breathing Light Particles — STYLE (invariants only)
Learned from Lemomo's 光点粒子 post (style study only). Measurements: /workspace/mosquito-film/styletest2/dots/REPORT.md.

## 1. Essence
Night picture-book. Every subject (people, animals, land, moon, grass) is a cloud of soft glowing dots on near-black. Dots breathe; subjects form by gathering and leave by scattering. Best for lyrical / character stories, nature, night, crowds, migration. **Not**: steps, numbers, dense facts, product UI.
## 2. Materials & rendering
Additive point sprites (bright white core → coloured halo → transparent), `lighter` blending so overlaps brighten. Core radius median 3.5 px @1080 (p25 3.0, p90 5.0); a few big "firefly" dots 1.5×. Extra glow pass: ¼-res blur ≈ 6–10 px @1080 added at 0.5. Faint coloured haze behind dense areas. Vignette.
## 3. Colour
Ground near-black with a cool-green cast, rgb ≈ (4–11, 5–13, 8–12), mean frame luma 12–38/255, pixels >90 only 0.3–12 %. Two-family palette: warm gold/cream for characters, moon, light (#f0dba0 / #e5e3d2 / #c2b28e); muted sage-olive for land, grass, animals, haze (#a7b47f / #9da17e / #777a5a). One accent only when the story needs it (our addition: red #ff6a4a). No saturated rainbow.
## 4. Type
Small bilingual subtitle at bottom centre, cream, no box; titles may be formed of dots at the end. In our films: subtitle ≥56 px @1080, typed 35 ms/char.
## 5. Motion
Every dot: per-dot twinkle ≈1.2 Hz random phase (luma ±2–3 %) + slow global breath ≈0.4 Hz (size ±12 %). Forming: dots fly in on bowed arcs with per-dot delay (0–0.35 s), ease-out. Leaving: dots scatter outward & upward, dim, ease-in. Shape morph = same dots re-targeted (never fade-swap). Outline sampling dense (~30 dots / 100×100 px @1080 on figures) vs ambient (2–5 / 100×100).
## 6. Camera
Mostly locked or very slow push/drift; no hard cuts in the reference (0 detected cuts in 50.6 s) — transitions are particle dispersal / regathering and fades to near-black.
## 7. Sound
Soft music, ~−14 LUFS, motion only loosely follows loudness (r ≈ 0.29). In our films: narration + BGM, keyword → element moves on the word.
## 8. Native moves
Scatter-and-regather transition; firefly stream / comet tail of dots; whole figure breathing; dots shiver = itch/anxiety; dots condense = attention.
## 9. Layout
Big negative space; horizon low (bottom 20–30 % land/grass); subject on thirds.
## 10. Engine
canvas 2D, pure function of t, seeded mulberry32; renders via headless Chrome + ffmpeg on the Mac mini (`demo/render_mac.sh`).
## 11. Don'ts
No line strokes (only dots); no hard cuts; no flat fills; don't copy the reference's girl/deer/moon composition.
