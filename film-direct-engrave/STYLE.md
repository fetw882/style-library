# Direct-Etched Film 胶片直刻 — Style Prompt

> Lines scratched straight into dark film stock, dyed by hand, glowing on projection.
> Source: style study of Lemomo *THE NIGHT CLIMB* (https://x.com/lemomo_ai/status/2116717173934825841) — style learning only; never reuse its footage, frames, characters or story.

## 1. Essence, and what it is not
A dark, warm-black film frame where every drawing is an **engraved warm-white line**, and each subject carries **one saturated dye** laid in hatching that glows. Everything is redrawn **on twos**, so lines, dye and scratches boil together: it feels hand-made and projected.

Not: a neon/cyberpunk glow look (no clean vector lines, no gradients), not a "vintage film" filter over footage (no sprocket holes, no frame borders, no sepia), not flat motion graphics, not chalkboard (lines are thin and luminous, ground is warm black, not green/grey).

## 2. Materials & rendering
- Ground: warm black `#130f10`; mean frame luma ≈ 29/255, lit area only 1–17 % of the frame.
- Line: warm white `#f5efe2`, median width ≈ 2 px @1080 (detail), outlines 4–10 px; line ends left open, pressure varies.
- Dye: per subject, −60° parallel hatching over a translucent base of the same colour that **spills past the outline**.
- Overlaps brighten (additive / screen), never darken.
- Glow: 6–10 px blur bloom on lines and dye.
- Film damage: many short curved white hair scratches + dust specks, **20–40 per redraw, re-scattered every redraw**.
- Vignette + a warm light leak. No sprocket holes, no frame border.

## 3. Colour logic
- Constants: warm black ground, warm white line.
- **One subject = one dye**: cyan `#3be6d6`, blue `#3585e2`, red `#df3e30`, gold `#e7bc27`. Never two dyes on one subject; never a large dye area that out-weighs the lead (keep secondary fills small).
- The accent the story follows gets the most saturated dye; dim non-leads to 40–60 %.

## 4. Type & subtitles
- Subtitles: warm white, light weight, small glow, bottom centre, never over the lead.
- On-screen words are etched like lines (stroke reveal), not pasted type. Size floors from the director rules (main ≥120 px, sub ≥56, label ≥34 @1080).

## 5. Motion quality
- Boil **on twos**: random seed = floor(frame/2). Lemomo measured at 15 redraws/s; our 24 fps test is 12/s (15/s needs 30 fps — decide per film).
- Motion slow and sparse; one lead at a time, ≤3 moving regions.
- **Keyword hit rule**: the element tied to a spoken keyword moves on that word (±1 frame) with a clearly visible change. Never let the boil hide a weak hit (e.g. test's 「他」 Δ+2 is too weak).

## 6. Camera grammar
- Mostly locked or slow push; hard cuts between ideas; left/right split screen for comparison (you vs him).

## 7. Sound palette
- Loudness −14 LUFS integrated, true peak ≤ −1.5 dBTP. Reference ran ≈129 BPM; motion does not need to sit on beats (reference r = −0.07), but keyword hits must sit on speech.
- No whispering, no sudden silence (user rule).

## 8. Native moves
- Hard cut (reference cuts at 14.30 / 23.37 / 30.97 s).
- Left/right split screen for comparisons (reference 15–31 s).
- A line etching itself in, then being dyed with hatching.

## 9. Pitfalls of the medium
- Too much dye area (the test's quilt) steals the lead.
- Hatching too sparse loses the scratched feel; keep it dense, with dark gaps.
- Thin lines vanish at small sizes (mosquitoes): thicken small subjects' outlines.
- Even, uniform glow looks digital; vary it.
- Unseeded randomness breaks parallel rendering.

## 10. Engine
- Canvas 2D hand-drawn per frame + post compositing (glow, scratches, vignette, leak) in the same page; every frame a pure function of t; seeded randomness.
- Render: on the cloud box ≤2 workers (software WebGL, 8 cores); **official renders on the Mac mini** (user rule 2026-11-01).
- H.264 yuv420p bt709 tv, faststart.

## 11. Variation space / known gaps for next version
- Characters: move from round-head stick figures to designed characters with expressions.
- Denser hatching with black gaps; smaller dye areas; varied glow.
- Boil 15/s (30 fps) vs 12/s (24 fps) to decide.
- Add graphic language (rulers, ticks, diagrams) of our own.
