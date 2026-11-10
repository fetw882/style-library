# Demo — Pixel RPG 2.5D Explainer 像素RPG 2.5D 科普

One example only. Don't reuse its story, shots or timings.

- Example film: our《如果你的反应快10倍》v7 (about 2 min, 1920×1080, 24 fps). The story is adapted from Ifverse (https://www.youtube.com/watch?v=MroF1XmHOZw), **adaptation reference only**; no Ifverse footage or frames are in this library.
- test.mp4: the first 14 s of v7 (cold-open choice box → slot-wheel title → office bullet-time beats), 960×540, 24 fps, **muted**. The BGM "We Never" has no licence proof, so no public file carries sound.
- test.jpg: the locked title "如果你的反应快10倍" (3.3 s). styleframe.jpg: a bullet-time shot (6.5 s).
- **The render source (Three.js scene, film timeline, engine copy, audio mixer, QA scanners) was deleted at the owner's request on 2026-11-10. The film cannot be re-rendered from this library.** Don't pretend otherwise; rebuild new films from STYLE.md.
- demo/ (what still exists):
  - `make_covers_v7.py`: generates the cover family (black grain card + choice-box frame + Fusion Pixel text) in 3:4, 4:3, 16:9, 9:16 and 1:1, and asserts the safe area / overlaps for every text box.
  - `build.sh`: runs it. Needs the Fusion Pixel TTF (OFL, download it from the official repo) and the approved cover-B image (kept in the final package, not in the library). It was tested on 2026-11-10 and reproduced all 5 covers byte for byte.
  - `cover_check.json`: the text boxes, safe areas and minimum edge distances of the v7 covers.
- The final package (film, covers, PUBLISH.md) stays local in /workspace/finals/reaction-10x-worldcup-v7/ and is not published.
