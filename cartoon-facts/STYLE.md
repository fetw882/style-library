# Cartoon Fun Facts 卡通冷知识 — Style Prompt
Status: draft (not yet approved by the user). Skill: 卡通冷知识短片 (skill-1793643373152). Kit: /workspace/shared/cartoon-facts-kit/

## 1. Essence, and what it is not
Vertical 1080×1920 flat 2D cartoon fun-fact short (30–35 s). One fact per line, one funny metaphor each; hook question shown on screen at once; the ending flips the hook into a gag. Not realistic, not slow push-ins on stills, no characters baked into backgrounds.
## 2. Materials & rendering
Thick dark-brown outlines, flat fills + simple cel shading, big eyes, vector feel. Characters are cutouts (9 poses: neutral, shout, shock, blush, heart-eyes, sweat, attack, wilted, sidekick) moving over 9 illustrated empty backgrounds (base scale 1.2). Floating motes, vignette.
## 3. Colour logic
Hero has its own palette clearly separated from background props. Keyword yellow #ffd21f with ink stroke; red marker for circles/arrows. No gradient text.
## 4. Type & subtitles
ZCOOL KuaiLe 站酷快乐体 (OFL). White pill caption bar at y=1470, 60–64 px, 2–4 characters per block, one yellow keyword per block. Big title at y=430, spring-in then wobble, no full stop. No emoji.
## 5. Motion quality
Nothing still for 1 s; a new action every 0.5–1 s inside a shot. Idle float, squash on pose change, speed lines on entry, starburst hit + shake, zoom punch 1.1. Every cut, pose, title and SFX is cued on real word timings (iron rule: element moves when the keyword is spoken).
## 6. Camera grammar
Hard cut every 1.5–3 s; each fact gets a new background and a new pose.
## 7. Sound palette
Fish Audio drama-3 科普男声, ~4.2–4.5 字/s; BGM ≈ −12 dB with sidechain, ~9 dB under voice; synthesized SFX (sfx_mix.py); total −14 LUFS.
## 8. Native moves
Red marker circle, curved red arrow, yellow/white starburst, 28-slice swim wobble, props in character local space.
## 9. Pitfalls of the medium
Grid-line slicing cuts neighbour limbs; white fringes; black edge at bottom when scaled; starburst too small turns to black ball; yuvj420p output; hero too small (+20%). No clipping/穿模.
## 10. Engine
Single HTML canvas, frame = pure function of t, window.seek/READY/END/EV; Playwright + system Chrome, 30 fps × 6 motion-blur subframes → ffmpeg. Final renders on the Mac mini.
## 11. Variation space / known gaps
Backgrounds generated at low resolution look soft; English version uses Luckiest Guy. Only the 0–15 s opening has been made so far.

## Rules for making a film in this style (user rules)
1. BGM teardown HTML review page first; wait for the human's explicit「通过」.
2. Script + shot plan to the user first; no image gen / voice / spending before confirmation.
3. Make only the 0–15 s opening first; self-review ≥ 90/100 before showing.
4. No clipping (不穿模).
5. Deliver only one 1080p release (H.264 CRF 18–20, yuv420p tv range, AAC) + one preview < 10 MB. Covers 4:3 and 3:4 only.
6. All rendering on the Mac mini. Facts need two independent sources.
