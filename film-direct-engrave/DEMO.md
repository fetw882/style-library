# Demo — Direct-Etched Film 胶片直刻

One example among many. Don't reuse its story, arc, shots, props or timings.

- Story: first 10 s of our film 《为什么蚊子总是咬你不咬他？》 v9 (narration + subtitles from v9).
- Output: test.mp4, 960×540, 24 fps, 10.000 s, H.264+AAC, −14.1 LUFS, peak −1.9 dBTP. Smoke render on box, 2 workers, 44 s.
- Files (demo/): `index.html` draws every frame (`render(t)`, seeded boil, lines, dye, scratches, post); `render.mjs` captures frames with headless Chrome; `render_mac.sh` concat + 2-pass loudnorm + mux; `build.sh` one command on the Mac mini; `audio_10s.wav` narration; `subs_10s.srt`; `verify_kw.mjs` checks keyword hits (region mean luma 0.25 s before vs 0.4 s after).

## Keyword hits (verify_kw.mjs)
| Word | t (s) | Element | Δ luma |
|---|---|---|---|
| 屋 | 0.69 | window frame etched | +19 |
| 晚上 | 1.59 | moon | +18 |
| 蚊子 | 1.99 | mosquito enters | — |
| 你 | 2.49 | head selected | +6 |
| 他 | 2.97 | head pulses | +2 (weak) |
| 睡 | 3.97 | Zzz | — |
| 天亮 | 4.17 | sun rises | — |
| 腿 | 4.59 | leg | +24 |
| 包 | 5.19 | red bump swells | — |
| 痒 | 5.37 | scratch marks | — |
| 爬起来 | 5.97 | sits up, eyes open | +17 |
| 开灯 | 6.41 | light cone | +26 |
| 错觉 | 7.95 | red cross over "?" | — |
| 总有人 | 8.25 | him dimmed, you glow | — |
| 招蚊子 | 9.03 | four mosquitoes circle | — |
| 你妈 | 9.81 | speech bubble | — |

## Known gaps
Round-head stick figures; quilt dye area too big; hatching too sparse; glow too uniform; mosquito lines thin; 「他」 hit weak; boil 12/s not 15/s; kickoff/shots/checklist were not fully written for this test, so no self-score.
