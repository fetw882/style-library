// node render.mjs  -> frames piped to ffmpeg; W=960 H=540 FPS=24 DUR=10
import { chromium } from 'playwright-core';
import { spawn } from 'child_process'; import path from 'path'; import fs from 'fs';
const dir = path.dirname(new URL(import.meta.url).pathname), FPS = 24, W = 960, H = 540, WK = +(process.env.WORKERS || 4);
const exe = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(f => fs.existsSync(f));
const browser = await chromium.launch({ executablePath: exe });
const N = Math.round(10.0 * FPS), per = Math.ceil(N / WK); fs.mkdirSync(path.join(dir, 'seg'), { recursive: true });
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = w * per, b = Math.min(N, a + per); if (a >= b) return;
  const p = await browser.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.error('page error', e.message));
  await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction(() => window.READY);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '' + FPS, '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', path.join(dir, 'seg', `s${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) { await p.evaluate(t => window.render(t), f / FPS); const buf = await p.screenshot({ type: 'png' }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (f % 24 === 0) console.log('frame', f); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close();
}));
for (const t of [2.6, 5.8, 9.6]) { const p = await browser.newPage({ viewport: { width: W, height: H } }); await p.goto('file://' + path.join(dir, 'index.html')); await p.waitForFunction(() => window.READY); await p.evaluate(t => window.render(t), t); await p.screenshot({ path: path.join(dir, `filmscratch_v2_${t}s.jpg`), type: 'jpeg', quality: 92 }); await p.close(); }
fs.writeFileSync(path.join(dir, 'seg', 'list.txt'), [...Array(WK)].map((_, w) => `file 's${w}.mp4'`).filter((_, w) => w * per < N).join('\n'));
await browser.close();
