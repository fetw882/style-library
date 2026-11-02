# Paper Checklist Explainer 清单讲解 — Style Prompt
Status: draft (not yet approved by the owner). Replaces 红线火柴人.
License boundary: this look is produced with an engine licensed to the owner only. The engine, its source code and its original docs are never shared or published; this entry holds only our own summary, muted previews and keyframes. To make a film in this style you still need the owner's locally installed engine.

## 1. Essence, and what it is not
A vertical explainer that breaks one concept into steps with UI-checklist parts (rounded cards, pill tags, tick lists, bubbles, arrow routes, phone/interface frames) on warm paper, with an original presenter talking from the bottom-right. Not stock motion-graphics templates, not live footage, no logos.
## 2. Materials & rendering
Off-white paper ground with light grain; far layer of pale-grey ridges or mist drifting slowly so the frame is never fully still. Thick ink outlines with offset hard shadows: a paper-cut card feel. Content scaled into the upper-left area to leave the presenter corner free.
## 3. Colour logic
Ink black for outlines and main text; one red for emphasis (keywords, seals, primary buttons, routes); neutral grey only as support. No other hues.
## 4. Type & subtitles
Fonts: Smiley Sans 得意黑 (headlines/captions) and LXGW WenKai 霞鹜文楷 (secondary), both OFL. Captions at the top (~y 330), revealed per character, the spoken character highlighted, keywords red or bold-enlarged. Emphasis devices: tilted red-box "seal", red pill tag, numbered badges 1/2/3. Opinion passages carry a clear red「观点」tag. Brands appear only as text cards.
## 5. Motion quality
Every sentence gets at least one visual action (pop, slide, tick, stamp, connect, count) triggered by a specific spoken character (iron rule). Self-check gates: motion ≥ 4.8, big moments ≥ 0.65/s, calm frames ≤ 27 %, no 2 s gap without a new event. Originality gates: roughly ≥ 40 scene-code lines/s and ≥ 2.5 self-drawn props/mechanisms per second — each script invents its own metaphors.
## 6. Camera grammar
1080×1920, 30 fps, code-only. Safe area y 360–1420; nothing in the right 120 px; bottom-right reserved for the presenter. Light whip between sentences; constant slow push or drift.
## 7. Sound palette
Fish Audio Drama 3 科普男声, whole script in one take, optional slight speed-up (~1.1×; sample_e kept 1.0). Local Whisper per-character alignment checked by CER against the script. Locally synthesized whoosh/pop/ding/stamp SFX on visual events, bus under the voice, near-duplicates merged. Two-pass loudnorm −14 LUFS, TP ≤ −1.5.
## 8. Native moves
Red stamp slam, tick-list fill, numbered badge count, arrow route drawing itself, card flip, presenter pointing at the active card.
## 9. Pitfalls of the medium
Too many reused stock parts fail the originality gate; content under the presenter or caption; dead 2 s stretches; hidden hits during transitions (land the hit before the cut).
## 10. Engine
Owner-licensed local engine (canvas rendering + headless capture + ffmpeg); not shared. Final renders on the Mac mini; one render at a time. Release: H.264 High 4.1 yuv420p tv range CRF 18; mobile CRF 24, ≤3 Mbps, AAC 128k, faststart. Covers 3:4 and 4:3.
## 11. Variation space / known gaps
Presenter: engine-drawn glasses presenter, or the owner's own paper-cut character (sample_e). Pace 20–52 s. Caption lead timing vs on-the-word timing still to settle per film.

## Rules for making a film (owner rules)
1. 12–16 frame stills sheet reviewed before rendering video.
2. Motion and originality gates must pass; at most 4 rounds; never bypass.
3. No upload or publishing until the owner confirms. Facts need sources; no made-up numbers.
