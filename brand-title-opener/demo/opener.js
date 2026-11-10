// newbeer.lee 厂牌片头引擎 v3（反差-旋回）—— 每一帧都是时间 t 的纯函数（无 setTimeout / 无 CSS 动画 / 固定种子）；v2 引擎副本在 v2_engine/
// 所有时间用秒定义；带 "_30" 后缀的量按 30fps 帧计数定义（j_30 = (t-D)*30），换帧率时按秒换算。
(function () {
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutCubic = k => 1 - Math.pow(1 - k, 3);
const easeInCubic = k => k * k * k;
const easeOutQuad = k => 1 - (1 - k) * (1 - k);
const easeInQuad = k => k * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); }
function mixHex(a, b, k) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',') + ')'; }
function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- 不变量常量（品牌逻辑，所有皮肤共用） ----------
const C = {
  CUR_PRE: 0.50,      // 光标先闪的时长
  CUR_BLINK: 0.50,    // 光标闪烁周期（2Hz，占空比 50%，硬切）
  CUR_GROW: 0.10,     // 光标出现时从 0 高长到满高
  CHAR_DT: 0.04,      // 【v2 停用】旧版固定字距；v2 出字踏拍网格，见 pickSeq
  CHAR_SETTLE: 0.10,  // 最后一字落定余量
  OPEN: 0.20,         // 光标变形成选中带 + 滚轮框展开
  ROLL: 1.03,         // 滚动段（含减速）
  OVS: 0.22,          // 过冲回弹段
  OV: 0.18,           // 过冲量（行距的 18%）
  DETENT: 0.35,       // 棘轮感强度（越过每格时速度在格位处降到 65%）
  POP_AMP: 0.28, POP_TAU: 0.040, POP_PER: 0.11, POP_Y: 0.08,  // 字的弹出曲线（v2：更有力，≈0.15s 落稳）
  HEAT_PEAK: 0.75, HEAT_REST: 0.22, HEAT_TAU: 0.07,            // 出字热色：峰值 75% → 常驻 22%（v2：落定后不退成平白）
  PITCH: 1.10,        // 滚轮行距 = 1.10 × 字号
  BOX_ROWS: 2.30,     // 框内高 = 2.30 行距
  BAND: 1.07,         // 选中带高 = 1.07 行距
  MASK: 0.50,         // 上下渐隐遮罩高 = 0.50 × 字号
  PAD: 0.12,          // 框左右内边距
  GAP: 0.16,          // 前半句与滚轮字之间
  BREATH: 0.80,       // 选中带呼吸周期
  LOCK_SCALE: 1.04,   // 锁定后常驻放大
  HOLD: 1.00, EXIT: 0.50, EXIT_GLYPH: 0.20, EXIT_STAGGER: 0.025,
  SUFFIX_DELAY: 0.12, SUB_DELAY: 0.35, SIG_IN: 0.10, SIG_DUR: 0.30, SIG_OUT: 0.25,
  SHAKE_Y: [8, -5, 3, -1.5, 0.5, 0], SHAKE_X: [-3, 2, -1, 0.5, 0, 0],  // 1080 基准像素，j_30 = 0..5
  PARTS: 12, PART_LIFE_30: 14, PART_TAU: 0.12, PART_V: 7.5,  // 粒子：初速 7.5×字号/秒
  BLUR_SAMPLES: 7, BLUR_SHUTTER: 0.4,  // 运动模糊：0.4 帧快门（144°）7 次采样
  // ---- v3 反差-旋回（用户 2026-11-10「10倍这里做一个反差选择，最后旋转回我们的主题词」；取代 OVS/OV 过冲段） ----
  ROLL3: 1.03,        // Rs→Rc（与 v2 ROLL 同长；首个可见运动帧→落定帧 ≥1.0s）：从 0 二次减速滚到反差行 N+1（途经主题行 N，保留棘轮不停死）
  CHOLD: 0.19,        // Rc→Rh（落定前 1–2 帧已在 <2% 行距内且无模糊 → 可读 7–8 帧，盖住 3.06 拍）：反差词静止可读（不锁定、不变黄、不闪白、不屏震）
  BACK: 0.16,         // Rh→D：反向旋回主题行 N
  BACK_K: 2.0,        // 旋回曲线 b(τ)=1-(1-τ)^2(1-K·τ)：K=2 → 到位回弹 3.7% 行距（<8%），D 帧 p=N 且速度 0
  BACK_G: 1.4,        // τ = w^1.4：起步 1 帧蓄力再甩回，让旋回在 30fps 下有 3 帧可见中间位（0.30/0.72/0.98 行），不像跳切
  NOPE_SQ: 0.06, NOPE_DUR: 0.16,   // 反差词落定时选中带「紧一下」：高度最多收 6%，0.16s 内回原，同时线条亮度降 25%（被否定感）
};
// v3：反差词默认规则（render.py 也会算一遍并传入 P.contrast）
function defaultContrast(values) {
  const th = values[values.length - 1], m = /^(\d+)(.*)$/.exec(th);
  if (m) return (parseInt(m[1], 10) === 1 ? '10' : '1') + m[2];
  const o = values.find(v => v !== th); return o != null ? o : th;
}
// 【v2 停用】旧压缩表，保留仅供对照 v1；v2 压缩顺序见 buildTimeline
const MIN = { CUR_PRE: 0.0, CHAR_DT: 0.03, CHAR_SETTLE: 0.067, OPEN: 0.12, ROLL: 1.00, OVS: 0.15 };
const SHRINK_ORDER = [['CUR_PRE', 0.20], ['CHAR_DT', 0.03], ['OPEN', 0.12], ['CHAR_SETTLE', 0.067], ['CUR_PRE', 0.0], ['ROLL', 1.00], ['OVS', 0.15]];

// ---------- 节拍网格 ----------
// 传入 beats（[[秒, 拍位]...] 或 [秒...]）就用歌的实测拍；否则以 D 为一拍、按 bpm（默认 112.7）倒推 4/4 网格。
function beatGrid(P, D) {
  let beats, down;
  if (P.beats && P.beats.length) {
    beats = P.beats.map(b => Array.isArray(b) ? b[0] : b);
    down = P.downbeats && P.downbeats.length ? P.downbeats.slice() : P.beats.filter(b => Array.isArray(b) && b[1] === 1).map(b => b[0]);
  } else {
    const per = 60 / (P.bpm || 112.7); beats = []; down = [];
    for (let k = -Math.ceil((D + 2) / per); k <= Math.ceil(4 / per); k++) { const t = D + k * per; beats.push(t); if (((k % 4) + 4) % 4 === 0) down.push(t); }
  }
  const d = beats.slice(1).map((x, i) => x - beats[i]).sort((x, y) => x - y); const per = d[Math.floor(d.length / 2)];
  return { beats, down, per, source: P.beats && P.beats.length ? 'beats' : `D 倒推 ${(60 / per).toFixed(1)} BPM` };
}
// m = 每拍细分数：2=8分 4=16分 6=16分三连音 8=32分；在相邻实测拍之间线性插值，首拍前/末拍后按中位拍长外推
function subdiv(G, m) {
  const b = G.beats, out = [];
  for (let k = 4; k >= 1; k--) for (let j = 0; j < m; j++) out.push({ t: b[0] - k * G.per + j * G.per / m, j });
  for (let i = 0; i < b.length - 1; i++) for (let j = 0; j < m; j++) out.push({ t: b[i] + j * (b[i + 1] - b[i]) / m, j });
  for (let k = 0; k < 8; k++) for (let j = 0; j < m; j++) out.push({ t: b[b.length - 1] + k * G.per + j * G.per / m, j });
  return out;
}
const DIVS = [[2, '8分音符'], [4, '16分音符'], [6, '16分三连音'], [8, '32分音符']];
// 选 n 个连续网格点：首字 ≥ minStart，末字 ≤ Lmax，相邻点至少隔 1 帧；优先首字落在强拍(3) > 拍(2) > 8分(1) > 其它，同分取更晚（贴近滚轮）
function pickSeq(G, n, minStart, Lmax, fps) {
  const isNear = (t, arr) => arr.some(x => Math.abs(x - t) < 0.02);
  for (const [m, name] of DIVS) {
    if (G.per / m < 1 / fps - 1e-6) continue;
    const g = subdiv(G, m); let best = null;
    for (let i = 0; i + n - 1 < g.length; i++) {
      const s = g[i].t, e = g[i + n - 1].t;
      if (s < minStart - 1e-6 || e > Lmax + 1e-6) continue;
      const fr = g.slice(i, i + n).map(x => Math.round(x.t * fps)); if (fr.some((f, k) => k && f <= fr[k - 1])) continue;
      const score = isNear(s, G.down) ? 3 : isNear(s, G.beats) ? 2 : (m >= 2 && g[i].j % (m / 2) === 0) ? 1 : 0;
      if (!best || score > best.score || (score === best.score && s > best.s)) best = { score, s, i, times: g.slice(i, i + n).map(x => x.t), m, name };
    }
    if (best) return best;
  }
  return null;
}
function nextGrid(G, m, from, n, fps) {
  const g = subdiv(G, m).map(x => x.t).filter(t => t >= from - 1e-6); const out = [];
  for (const t of g) { if (out.length === n) break; if (!out.length || Math.round(t * fps) > Math.round(out[out.length - 1] * fps)) out.push(t); }
  return out;
}
// ---------- 时间线（相对 drop 倒推） ----------
function buildTimeline(P) {
  const fps = P.fps, n = [...P.prefix].length, N = P.values.length - 1;
  const D = Math.round(P.drop * fps) / fps;          // 锁定帧 = 离 drop 最近的帧
  const k = Object.assign({}, C);
  const G = beatGrid(P, D);
  const earliest = P.earliest || 0;
  const log = [];
  let seq = null, curBeats = 1;
  // v3 压缩顺序：先压 OPEN（0.16→0.14→0.12）和末字余量，保住首字强拍；再去光标先闪；最后才动 ROLL3。
  // 每一步都试排出字；首字落强拍(score 3)即停；全程没有强拍时取分最高、最早的一步（不为凑强拍多压时间）。
  k.OPEN = 0.16;
  const steps = [() => {}, () => { k.OPEN = 0.14; log.push('OPEN -> 0.140s'); }, () => { k.OPEN = 0.12; log.push('OPEN -> 0.120s'); },
    () => { k.CHAR_SETTLE = 0.067; log.push('CHAR_SETTLE -> 0.067s'); }, () => { curBeats = 0; log.push('光标先闪 1拍 -> 0'); },
    () => { k.ROLL3 = 0.95; log.push('ROLL3 -> 0.950s'); }, () => { k.BACK = 0.15; log.push('BACK -> 0.150s'); }];
  const Lof = () => D - k.BACK - k.CHOLD - k.ROLL3 - k.OPEN - k.CHAR_SETTLE;
  let best = null;
  for (const st of steps) {
    st();
    const s = pickSeq(G, n, earliest + curBeats * G.per, Lof(), fps);
    if (s && (!best || s.score > best.seq.score)) best = { seq: s, k: Object.assign({}, k), curBeats, log: log.slice() };
    if (s && s.score >= 3) break;
  }
  if (!best) throw new Error(`drop 太早：在 ${Lof().toFixed(2)}s 之前放不下 ${n} 个一帧一字的节拍点。请把 drop 后移或在片头前加静音。`);
  seq = best.seq; Object.assign(k, best.k); curBeats = best.curBeats; log.length = 0; log.push(...best.log);
  if (seq.m !== 2) log.unshift(`出字改用 ${seq.name}（8分音符放不下）`);
  const Rh = D - k.BACK, Rc = Rh - k.CHOLD, Rs = Rc - k.ROLL3, Bo = Rs - k.OPEN, Re = Rc;
  const charGrid = seq.times;                                  // 设计节拍时刻（声音贴这里）
  const charT = charGrid.map(t => Math.round(t * fps) / fps);  // 画面：离节拍最近的帧（误差 ≤ ½ 帧）
  const T0 = charT[0], Lc = charT[n - 1];
  const CurOn = Math.max(earliest, charGrid[0] - curBeats * G.per);
  const sufG = nextGrid(G, seq.m, D + k.SUFFIX_DELAY, [...(P.suffix || '')].length, fps);
  const subG = nextGrid(G, seq.m, D + k.SUB_DELAY, [...(P.sub || '')].length, fps);
  const sufT = sufG.map(t => Math.round(t * fps) / fps), subT = subG.map(t => Math.round(t * fps) / fps);
  // 退场：交接帧 E 落在 D+HOLD+EXIT 之后的第一个拍上（或 --exit-at）
  let X0;
  if (P.exitAt != null) X0 = Math.round(P.exitAt * fps) / fps;
  else { const eb = G.beats.concat(Array.from({ length: 8 }, (_, i) => G.beats[G.beats.length - 1] + (i + 1) * G.per)).find(b => b >= D + k.HOLD + k.EXIT - 1e-6); X0 = Math.round((eb - k.EXIT) * fps) / fps; }
  const E = X0 + k.EXIT;
  const contrast = P.contrast || defaultContrast(P.values), NC = N + 1, vals = P.values.concat([contrast]);
  const T = { fps, n, N, NC, vals, contrast, D, CurOn, T0, Lc, Bo, Rs, Re, Rc, Rh, X0, E, charT, charGrid, sufT, sufG, subT, subG, k, compress: log,
    grid: { source: G.source, per: G.per, div: seq.name, m: seq.m, startScore: seq.score }, blinkPhase: charGrid[0], blinkPer: G.per,
    SigIn: D + k.SIG_IN, SigFull: D + k.SIG_IN + k.SIG_DUR };
  T.ticks = [];
  // 正向越过 1..N+1（N+1 = 反差词落定，恰在 Rc）
  for (let i = 1; i <= NC; i++) {
    let a = Rs, b = Rc; if (wheelP(T, b) < i - 1e-9) continue;
    for (let it = 0; it < 60; it++) { const m = (a + b) / 2; if (wheelP(T, m) < i) a = m; else b = m; }
    T.ticks.push({ k: i, t: b, dir: 1 });
  }
  // 反向越回 N（旋回段，p 在 w=0.5 处首次降到 N）
  { let a = Rh, b = Rh + 0.74 * k.BACK; for (let it = 0; it < 60; it++) { const m = (a + b) / 2; if (wheelP(T, m) > N) a = m; else b = m; } T.ticks.push({ k: N, t: b, dir: -1 }); }
  return T;
}
// v3 p(t)：0 →（二次减速+棘轮，途经 N）→ N+1 反差词静止 →（反向 easeOut，3.7% 回弹）→ D 帧 p=N
function wheelP(T, t) {
  const { N, k } = T, NC = N + 1;
  if (t < T.Rs) return 0;
  if (t < T.Rc) {
    const u = (t - T.Rs) / k.ROLL3;
    const b = NC * (1 - (1 - u) * (1 - u));                // 二次减速 easeOutQuad，终点 N+1、速度 0
    const K = k.DETENT * (1 - smooth(0.8, 1, u));          // 末 20% 去掉棘轮（越过 N 时 u≈0.67，棘轮仍在 → 经过但不停死）
    return b - K * Math.sin(2 * Math.PI * b) / (2 * Math.PI);
  }
  if (t < T.Rh) return NC;                                 // 反差词停顿
  if (t < T.D) {
    const w = Math.pow((t - T.Rh) / k.BACK, k.BACK_G);
    return NC - (1 - (1 - w) * (1 - w) * (1 - k.BACK_K * w));   // 反向；w=1 时 =N、速度 0
  }
  return N;
}
// 字弹出：dt = 距本字出现帧的秒数（出现帧 dt=0 → 1.20 倍；整字不透明，不渐显）
function pop(dt) {
  if (dt < 0) return null;
  const e = Math.exp(-dt / C.POP_TAU) * Math.cos(2 * Math.PI * dt / C.POP_PER);
  return { s: 1 + C.POP_AMP * e, y: -C.POP_Y * e, heat: C.HEAT_REST + (C.HEAT_PEAK - C.HEAT_REST) * Math.exp(-dt / C.HEAT_TAU) };
}

// ---------- 版式 ----------
function layout(ctx, P, S, W, H) {
  const portrait = H > W;
  const vals = P.values.concat([P.contrast || defaultContrast(P.values)]), theme = P.values[P.values.length - 1], pre = [...P.prefix], suf = [...(P.suffix || '')], sub = [...(P.sub || '')];
  const font = fs => `${S.font.weight} ${fs}px ${S.font.family}`;
  const meas = (s, fs) => { ctx.font = font(fs); return ctx.measureText(s).width + (S.font.track || 0) * fs * [...s].length; };
  const qf = fs => S.font.quant ? Math.floor(fs / S.font.quant) * S.font.quant : fs * 0.999;
  const q = fs => S.font.quant ? Math.max(S.font.quant, Math.round(fs / S.font.quant) * S.font.quant) : fs;
  let L = {};
  if (!portrait) {
    let FS = q(180 * H / 1080);
    for (let it = 0; it < 6; it++) {
      const w = meas(P.prefix, FS) + (C.GAP + (S.font.overhang || 0)) * FS + meas(theme, FS) * C.LOCK_SCALE + (suf.length ? 0.02 * FS + meas(P.suffix, FS) : 0);
      const wbox = meas(P.prefix, FS) + (C.GAP + (S.font.overhang || 0)) * FS + Math.max(...vals.map(v => meas(v, FS))) + C.PAD * FS;
      const lim = 0.88 * W; const ww = Math.max(w, wbox);
      if (ww <= lim) break; FS = qf(FS * lim / ww);
    }
    const preW = meas(P.prefix, FS), finW = meas(theme, FS), sufW = suf.length ? 0.02 * FS + meas(P.suffix, FS) : 0;
    const lineW = preW + (C.GAP + (S.font.overhang || 0)) * FS + finW * C.LOCK_SCALE + sufW;
    const x0 = (W - lineW) / 2, cy = 0.437 * H;
    L = { FS, FS2: FS, cy1: cy, cy2: cy, x0, xw: x0 + preW + (C.GAP + (S.font.overhang || 0)) * FS, lineX: x0, lineW };
    L.sig = { x: W - 96 * H / 1080, y: H - 80 * H / 1080, fs: 34 * H / 1080 };
    L.subFS = 0.6 * FS; L.subY = cy + 0.5 * FS + 0.35 * FS + 0.5 * L.subFS;
  } else {
    const s = W / 1080, maxW = W - 240 * s;
    let FS1 = q(Math.min(120 * s, maxW / Math.max(1, pre.length) * 0.98));
    let FS2 = q(1.30 * FS1);
    for (let it = 0; it < 6; it++) {
      const w2 = Math.max(meas(theme, FS2) * C.LOCK_SCALE + (suf.length ? 0.02 * FS2 + meas(P.suffix, FS2) : 0), Math.max(...vals.map(v => meas(v, FS2))) + 2 * C.PAD * FS2);
      if (w2 <= maxW) break; FS2 = qf(FS2 * maxW / w2);
    }
    for (let it = 0; it < 6; it++) { if (meas(P.prefix, FS1) <= maxW) break; FS1 = qf(FS1 * maxW / meas(P.prefix, FS1)); }
    const preW = meas(P.prefix, FS1), finW = meas(theme, FS2), sufW = suf.length ? 0.02 * FS2 + meas(P.suffix, FS2) : 0;
    const cy1 = 0.38 * H, cy2 = cy1 + 0.5 * FS1 + 0.15 * FS1 + 0.5 * C.BOX_ROWS * C.PITCH * FS2;   // 第二行滚轮框顶 = 第一行字底 + 0.15×字号
    const line2W = finW * C.LOCK_SCALE + sufW;
    L = { FS: FS1, FS2, cy1, cy2, x0: (W - preW) / 2, xw: (W - line2W) / 2, lineX: (W - Math.max(preW, line2W)) / 2, lineW: Math.max(preW, line2W) };
    L.sig = { x: W - 140 * s, y: 1400 * H / 1920, fs: 34 * s };
    L.subFS = 0.6 * FS1; L.subY = cy2 + 0.5 * FS2 + 0.35 * FS2 + 0.5 * L.subFS;
  }
  L.portrait = portrait; L.font = font; L.meas = meas;
  // 前半句逐字位置
  let x = L.x0; L.pre = pre.map(ch => { const w = meas(ch, L.FS); const o = { ch, x, w }; x += w; return o; });
  L.preEnd = x;
  const F2 = L.FS2;
  L.valW = vals.map(v => meas(v, F2));                 // v3：含反差词（末项），框宽按其中最宽者
  L.finW = meas(theme, F2);                             // 锁定字/整句居中仍按主题词
  L.pitch = C.PITCH * F2;
  const bw = Math.max(...L.valW) + 2 * C.PAD * F2, bh = C.BOX_ROWS * L.pitch;
  L.box = { x: L.xw - C.PAD * F2, y: L.cy2 - bh / 2, w: bw, h: bh };
  L.band = { x: L.box.x, y: L.cy2 - C.BAND * L.pitch / 2, w: bw, h: C.BAND * L.pitch };
  L.railW = Math.max(4, F2 / 12); L.capH = 0.10 * F2;
  let sx = L.xw + L.finW * C.LOCK_SCALE + 0.02 * F2;
  L.suf = suf.map(ch => { const w = meas(ch, F2); const o = { ch, x: sx, w }; sx += w; return o; });
  // 副标题居中
  const subW = sub.length ? meas(P.sub, L.subFS) : 0; let ux = (W - subW) / 2;
  L.sub = sub.map(ch => { const w = meas(ch, L.subFS); const o = { ch, x: ux, w }; ux += w; return o; });
  // 光标位置：前半句末尾
  L.curW = Math.max(3, 0.08 * L.FS); L.curH = 0.86 * L.FS;
  return L;
}

// ---------- 渲染 ----------
let layer = null, lctx = null, tmp = null, tctx = null;
function renderFrame(ctx, W, H, P, S, T, L, t, fi) {
  if (!layer) { layer = document.createElement('canvas'); layer.width = W; layer.height = H; lctx = layer.getContext('2d', { willReadFrequently: true }); tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; tctx = tmp.getContext('2d'); }
  const sc = Math.min(W, H) / 1080;
  const j = (t - T.D) * 30;                    // 锁定后经过的“30fps 帧”
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = !S.font.quant; lctx.imageSmoothingEnabled = !S.font.quant;
  // 屏震（相机层，整画面含背景；背景超画 24px）
  let shx = 0, shy = 0;
  if (j >= 0 && j < 5) { const a = Math.floor(j), f = j - a; shy = lerp(C.SHAKE_Y[a], C.SHAKE_Y[a + 1], f) * sc; shx = lerp(C.SHAKE_X[a], C.SHAKE_X[a + 1], f) * sc; }
  S.bg(ctx, W, H, t, fi, shx, shy);
  ctx.setTransform(1, 0, 0, 1, shx, shy);
  const D = T.D, F = L.FS, F2 = L.FS2;
  const inExit = t >= T.X0;
  const exitK = g => { const G = L.pre.length + 1 + L.suf.length + L.sub.length; const st = Math.min(C.EXIT_STAGGER, 0.28 / Math.max(1, G - 1)); return clamp((t - (T.X0 + g * st)) / C.EXIT_GLYPH); };

  // --- 锁定光晕（在框和字后面）
  const lockCx = L.xw + L.finW * C.LOCK_SCALE / 2, lockCy = L.cy2;
  if (j >= 0) {
    let a = 0.18 + 0.37 * Math.exp(-j / 4);
    if (j > 12) a += 0.04 * Math.sin(2 * Math.PI * (t - D - 0.4) / 1.2);
    if (inExit) a *= 1 - easeInQuad(clamp((t - T.X0) / 0.30));
    const r = L.finW * (0.6 + 0.7 * easeOutCubic(clamp(j / 10)));
    S.halo(ctx, lockCx, lockCy, r, a);
  }
  // --- 滚轮框
  const openK = clamp((t - T.Bo) / T.k.OPEN);
  const openE = easeOutCubic(openK);
  const boxVisible = t >= T.Bo && j < 10;
  if (boxVisible) {
    const B = L.box, bandH = L.band.h;
    const h = lerp(bandH, B.h, openE), y = L.cy2 - h / 2;
    const fillA = j < 0 ? 1 : 1 - easeInQuad(clamp(j / 6));
    const railK = j < 0 ? 0 : easeInCubic(clamp((j - 1) / 8));
    const railA = (j < 0 ? Math.sqrt(openE) : 1 - railK);
    const railOff = 14 * sc * railK;
    // 框体
    S.boxFill(ctx, B.x, y, B.w, h, fillA * Math.min(1, openE * 1.5));
    // 行（画在离屏层，带遮罩）
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H);
    lctx.save(); lctx.beginPath(); lctx.rect(B.x, y, B.w, h); lctx.clip();
    const contentA = smooth(0.5, 1, openK) * (j < 0 ? 1 : 1 - clamp(j / 3));
    if (contentA > 0) {
      // v3：按快门内实际位移判断是否开模糊（快门 0.4 帧内拖影 >1.6px ⇔ 旧判据「速度 >4px/帧」）；
      // 旧判据用 ±½ 帧差分，会让反差停顿最后一帧（下一帧才起转）误开模糊、出现重影
      const sh = 0.5 * C.BLUR_SHUTTER / T.fps;
      const blur = Math.abs(wheelP(T, t + sh) - wheelP(T, t - sh)) * L.pitch > 1.6 * sc;
      const ns = blur ? C.BLUR_SAMPLES : 1;
      // 运动模糊：每个快门采样先在 tmp 上正常绘制，再以 1/ns 透明度 'lighter' 累加 = 快门内平均（静止时与单次绘制完全相同）
      for (let s = 0; s < ns; s++) {
        const ts = ns === 1 ? t : t + (s / (ns - 1) - 0.5) * C.BLUR_SHUTTER / T.fps;
        const p = wheelP(T, ts);
        const g = ns === 1 ? lctx : tctx;
        if (ns > 1) { tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, W, H); tctx.imageSmoothingEnabled = !S.font.quant; }
        for (let i = Math.max(0, Math.floor(p) - 2); i <= Math.min(T.NC, Math.ceil(p) + 2); i++) {
          const d = i - p, ad = Math.abs(d);
          if (j >= 0 && i === T.N) continue;          // 锁定后中心行由锁定字接管
          let a = ad <= 1 ? 1 - 0.55 * ad : ad <= 1.6 ? 0.45 * (1 - (ad - 1) / 0.6) : 0;
          if (a <= 0) continue;
          const s1 = 1 - 0.10 * Math.min(ad, 1.5), sy = Math.cos(Math.min(ad, 1.6) * 0.42);
          g.save(); g.globalAlpha = a * contentA;
          g.translate(L.xw, L.cy2 + d * L.pitch); g.scale(s1, s1 * sy);
          S.text(g, T.vals[i], 0, 0, F2, mixHex(S.c.text, S.c.heat, C.HEAT_REST), { row: true, heat: C.HEAT_REST });
          g.restore();
        }
        if (ns > 1) { lctx.globalCompositeOperation = 'lighter'; lctx.globalAlpha = 1 / ns; lctx.drawImage(tmp, 0, 0); lctx.globalAlpha = 1; }
      }
      lctx.globalCompositeOperation = 'source-over';
    }
    lctx.restore();
    // 上下渐隐遮罩：destination-out 线性渐变，高 MASK×字号
    const m = C.MASK * F2;
    lctx.globalCompositeOperation = 'destination-out';
    let g = lctx.createLinearGradient(0, y, 0, y + m); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(B.x, y, B.w, m);
    g = lctx.createLinearGradient(0, y + h - m, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    lctx.fillStyle = g; lctx.fillRect(B.x, y + h - m, B.w, m);
    lctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, shx, shy); ctx.setTransform(1, 0, 0, 1, shx, shy);
    // 选中带（从光标变形而来）
    {
      let bx = L.band.x, bw = L.band.w, bh = L.band.h, by = L.band.y;
      if (openK < 1) {   // 光标 → 选中带
        const cx = curX(L, T, t), e = openE;
        bx = lerp(cx, L.band.x, e); bw = lerp(L.curW, L.band.w, e); bh = lerp(L.curH, L.band.h, e); by = L.cy1 + (L.cy2 - L.cy1) * e - bh / 2;
      }
      let la = 0.80 + 0.20 * Math.sin(2 * Math.PI * (t - T.Bo) / C.BREATH);
      let flash = 0;
      // v3 反差词落定：选中带上下各收 NOPE_SQ/2 再回原、线条暗 25%（不变色、不闪、不震）
      const nope = nopeK(T, t);
      if (nope > 0) { const dh = C.NOPE_SQ * nope * bh; by += dh / 2; bh -= dh; la *= 1 - 0.25 * nope / 1; }
      if (j >= 0) { la = j < 1 ? 1 : 1 - clamp((j - 1) / 4); flash = j < 1 ? 1 : 0; }
      const fillA = openK < 1 ? lerp(1, S.c.bandFillA, clamp(openE * 1.6)) : S.c.bandFillA * (j < 0 ? 1 : 1 - clamp(j / 4));
      S.band(ctx, bx, by, bw, bh, la, fillA, flash, openE);
    }
    // 导轨 + 端盖
    if (railA > 0.001) S.rails(ctx, B.x, y, B.w, h, L.railW, L.capH, railA, railOff, sc);
  }
  // --- 光标
  if (t >= T.CurOn && t < T.Bo) {
    const lastTyped = T.charT.filter(x => x <= t).length;
    const typing = t >= T.T0 - 1e-9;
    const on = typing ? true : (((Math.floor((t - T.blinkPhase) / (T.blinkPer / 2)) % 2) + 2) % 2 === 0);   // 踏拍：拍点亮、半拍灭
    const grow = easeOutCubic(clamp((t - T.CurOn) / C.CUR_GROW));
    if (on) S.cursor(ctx, curX(L, T, t), L.cy1 - L.curH * grow / 2, L.curW, L.curH * grow);
  }
  // --- 前半句
  newestFirst(L.pre, T.charT).forEach(i => { const o = L.pre[i];
    const pp = pop(t - T.charT[i]); if (!pp) return;
    const ek = inExit ? exitK(i) : 0; if (ek >= 1) return;
    drawGlyph(ctx, S, o.ch, o.x, o.w, L.cy1, F, pp, ek, S.c.text);
  });
  // --- 锁定字
  if (j >= 0) {
    const g = L.pre.length; const ek = inExit ? exitK(g) : 0;
    if (ek < 1) {
      const col = mixHex(S.c.lockHot, S.c.lock, easeOutQuad(clamp(j / 4)));
      const s = C.LOCK_SCALE + 0.08 * Math.exp(-j / 2) * Math.cos(0.8 * j);
      const ch = 6 * sc * Math.exp(-j / 1.3);
      ctx.save(); ctx.translate(L.xw, L.cy2 + 0.42 * F2); ctx.scale(s * (1 + 0.08 * ek), s * (1 - easeInCubic(ek))); ctx.translate(0, -0.42 * F2);   // 以字左缘为锚：放大只向右，不压前半句
      if (ch >= 0.5) {
        ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = S.c.chromaOp || 'lighter';
        S.text(ctx, P.values[T.N], ch, 0, F2, S.c.chromaA, { flat: true });
        S.text(ctx, P.values[T.N], -ch, 0, F2, S.c.chromaB, { flat: true });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      S.text(ctx, P.values[T.N], 0, 0, F2, col, { lock: true, lockK: clamp(j / 4) });
      ctx.restore();
    }
  }
  // --- 后缀
  newestFirst(L.suf, T.sufT).forEach(i => { const o = L.suf[i];
    const pp = pop(t - T.sufT[i]); if (!pp) return;
    const ek = inExit ? exitK(L.pre.length + 1 + i) : 0; if (ek >= 1) return;
    drawGlyph(ctx, S, o.ch, o.x, o.w, L.cy2, F2, pp, ek, S.c.text);
  });
  // --- 副标题
  newestFirst(L.sub, T.subT).forEach(i => { const o = L.sub[i];
    const pp = pop(t - T.subT[i]); if (!pp) return;
    const ek = inExit ? exitK(L.pre.length + 1 + L.suf.length + i) : 0; if (ek >= 1) return;
    drawGlyph(ctx, S, o.ch, o.x, o.w, L.subY, L.subFS, pp, ek, S.c.sub);
  });
  // --- 锁定冲击：框轮廓外扩环 + 粒子
  if (j >= 0 && j < 10) {
    const k = clamp(j / 10), e = easeOutCubic(k) * 0.35 * F2;
    S.ring(ctx, L.box.x - e, L.band.y - e, L.box.w + 2 * e, L.band.h + 2 * e, 0.8 * Math.pow(1 - k, 1.5), lerp(4, 1, k) * sc);
  }
  if (j >= 0 && j < C.PART_LIFE_30) {
    const rnd = mulberry32(9157), tt = (t - D);
    const dist = C.PART_V * F2 * C.PART_TAU * (1 - Math.exp(-tt / C.PART_TAU));
    for (let i = 0; i < C.PARTS; i++) {
      const ang = i / C.PARTS * 2 * Math.PI + (rnd() - 0.5) * 0.35, sp = 0.75 + 0.5 * rnd();
      const rx = L.finW / 2 + 0.1 * F2, ry = 0.55 * F2;
      const x = lockCx + Math.cos(ang) * (rx + dist * sp), y = lockCy + Math.sin(ang) * (ry + dist * sp);
      const a = 1 - Math.pow(j / C.PART_LIFE_30, 1.5), size = F2 / 15 * lerp(1, 0.5, j / C.PART_LIFE_30);
      S.particle(ctx, x, y, size, a, ang);
    }
  }
  // --- 厂牌签名 newbeer.lee
  if (t >= T.SigIn) {
    let kin = easeOutCubic(clamp((t - T.SigIn) / C.SIG_DUR));
    let kout = inExit ? easeInCubic(clamp((t - T.X0) / C.SIG_OUT)) : 0;
    const vis = kin * (1 - kout);
    if (vis > 0.001) S.signature(ctx, L.sig.x, L.sig.y, L.sig.fs, vis, kin);
  }
  // --- 退场下划线
  if (inExit && t < T.E) {
    const g = clamp((t - T.X0) / 0.20), c = clamp((t - (T.X0 + 0.30)) / 0.20);
    const fullW = L.lineW * easeOutCubic(g), w = fullW * (1 - easeInCubic(c));
    const cx = L.lineX + L.lineW / 2, y = L.cy2 + 0.58 * F2, th = Math.max(2, 0.035 * F2);
    if (w > 0.5) S.underline(ctx, cx - w / 2, y, w, th);
  }
  // --- 闪白
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (j >= 0 && j < 4) { ctx.globalAlpha = 0.14 * Math.exp(-j / 1.0); ctx.fillStyle = S.c.flash; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (S.post) S.post(ctx, W, H, t, fi);
}
// 新增 v2：弹出中的新字先画、已落定的旧字后画（叠在上面）——新字 1.28 倍回弹 + 深描边不会盖住前一个字
function newestFirst(arr, ts) { return arr.map((o, i) => i).sort((a, b) => (ts[b] - ts[a]) || (b - a)); }
function nopeK(T, t) { return (T.Rc != null && t >= T.Rc && t < T.Rc + C.NOPE_DUR) ? Math.sin(Math.PI * (t - T.Rc) / C.NOPE_DUR) : 0; }
function curX(L, T, t) {
  const typed = T.charT.filter(x => x <= t + 1e-9).length;
  const x = typed === 0 ? L.x0 : L.pre[typed - 1].x + L.pre[typed - 1].w;
  return x + 0.04 * L.FS;
}
function drawGlyph(ctx, S, ch, x, w, cy, fs, pp, ek, color) {
  let s = pp.s; if (S.font.quant) s = Math.round(s * 24) / 24;
  let y = pp.y * fs; if (S.font.quant) y = Math.round(y / (fs / 24)) * (fs / 24);
  const sy = 1 - easeInCubic(ek), sx = 1 + 0.08 * ek;
  if (sy < 0.04) return;
  ctx.save();
  ctx.translate(x + w / 2, cy + 0.42 * fs + y);      // 以字底（基线附近）为锚点缩放：落定=沉降
  ctx.scale(s * sx, s * sy);
  ctx.translate(-w / 2, -0.42 * fs);
  const col = mixHex(color, S.c.heat, pp.heat);
  S.text(ctx, ch, 0, 0, fs, col, { heat: pp.heat, glyph: true });
  ctx.restore();
}
// 逐帧描述（用于生成帧级时间轴表与自检）
function describe(P, S, T, L, t) {
  const j = (t - T.D) * 30, p = wheelP(T, t);
  const row = Math.round(p);
  const st = [];
  if (t >= T.CurOn && t < T.Bo) { const typing = t >= T.T0 - 1e-9; st.push(typing ? '光标常亮' : ((((Math.floor((t - T.blinkPhase) / (T.blinkPer / 2)) % 2) + 2) % 2 === 0) ? `光标亮${t - T.CurOn < C.CUR_GROW ? '(生长' + Math.round(easeOutCubic(clamp((t - T.CurOn) / C.CUR_GROW)) * 100) + '%)' : ''}` : '光标灭')); }
  const typed = [];
  T.charT.forEach((ct, i) => { const pp = pop(t - ct); if (pp && t - ct < 0.20) typed.push(`${L.pre[i].ch}:s${pp.s.toFixed(3)} y${(pp.y * 100).toFixed(1)}%字号 热${Math.round(pp.heat * 100)}%`); });
  if (typed.length) st.push('弹出 ' + typed.join(' '));
  if (t >= T.Bo && t < T.Rs) st.push(`光标→选中带变形 ${Math.round(easeOutCubic(clamp((t - T.Bo) / T.k.OPEN)) * 100)}%`);
  if (t >= T.Rs && t < T.D) { const hh = 1 / 60; const v = (wheelP(T, t + hh) - wheelP(T, t - hh)) / (2 * hh) / 30; const ph = t < T.Rc ? '正滚' : t < T.Rh ? '反差停顿' : '旋回'; const nk = nopeK(T, t); const shd = 0.5 * C.BLUR_SHUTTER / T.fps, smear = Math.abs(wheelP(T, t + shd) - wheelP(T, t - shd)) * L.pitch; st.push(`${ph} 滚轮 p=${p.toFixed(3)} 中心「${T.vals[clamp(row, 0, T.NC)]}」${row === T.NC ? '(反差词·不锁定)' : row === T.N && t < T.Rc ? '(主题词经过)' : ''}${nk > 0 ? ` 选中带收${(C.NOPE_SQ * nk * 100).toFixed(1)}%` : ''} 速度${v.toFixed(3)}行/帧(${(v * L.pitch).toFixed(0)}px)${smear > 1.6 * L.sig.fs / 34 ? ' 模糊开' : ''} 偏移${((p - row) * L.pitch).toFixed(1)}px`); }
  if (j >= -1e-6 && j < 15) {
    const e = [];
    if (j < 4) e.push(`闪白${(14 * Math.exp(-j)).toFixed(1)}%`);
    if (j < 5) { const a = Math.floor(j); e.push(`屏震(${C.SHAKE_X[a]},${C.SHAKE_Y[a]})px`); }
    const ch = 6 * Math.exp(-j / 1.3); if (ch >= 0.5) e.push(`色差±${ch.toFixed(1)}px`);
    e.push(`变黄${Math.round(easeOutQuad(clamp(j / 4)) * 100)}%`, `字缩放${(C.LOCK_SCALE + 0.08 * Math.exp(-j / 2) * Math.cos(0.8 * j)).toFixed(3)}`);
    if (j < 10) e.push(`外扩环${Math.round(easeOutCubic(clamp(j / 10)) * 35)}%字号 α${(0.8 * Math.pow(1 - clamp(j / 10), 1.5)).toFixed(2)}`);
    if (j < 14) e.push(`粒子α${(1 - Math.pow(j / 14, 1.5)).toFixed(2)}`);
    e.push(`光晕α${(0.18 + 0.37 * Math.exp(-j / 4)).toFixed(2)}`);
    if (j < 6) e.push(`框底α${(1 - easeInQuad(clamp(j / 6))).toFixed(2)}`);
    if (j < 9) e.push(`导轨α${(1 - easeInCubic(clamp((j - 1) / 8))).toFixed(2)}外移${(14 * easeInCubic(clamp((j - 1) / 8))).toFixed(1)}px`);
    st.push('锁定 ' + e.join(' '));
  }
  if (t >= T.SigIn && t < T.SigFull + 0.01) st.push(`签名擦出${Math.round(easeOutCubic(clamp((t - T.SigIn) / C.SIG_DUR)) * 100)}%`);
  if (t >= T.X0 && t < T.E) st.push(`退场 下划线${Math.round(easeOutCubic(clamp((t - T.X0) / 0.2)) * (1 - easeInCubic(clamp((t - T.X0 - 0.3) / 0.2))) * 100)}% 签名收${Math.round(easeInCubic(clamp((t - T.X0) / C.SIG_OUT)) * 100)}%`);
  if (t >= T.E) st.push('空底 → 硬切正片');
  return st.join('；');
}
window.BRAND = { C, MIN, defaultContrast, buildTimeline, wheelP, pop, layout, renderFrame, describe };
})();
