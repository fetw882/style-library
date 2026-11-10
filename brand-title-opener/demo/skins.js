// 皮肤层：只改材质（字体/颜色/质感/粒子形状），不改任何时间与运动。
(function () {
function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); }
function rgba(c, a) { if (!c.startsWith('#')) return c; const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const noiseCache = {};
function mix(a, b, t) { if (!a.startsWith('#') || !b.startsWith('#')) return a; const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function toHex(c) { if (c.startsWith('#')) return c; const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); }
// 柔光晕：椭圆形径向渐变（先压扁坐标再画圆，边缘真正衰减到 0，无硬边）
function softHalo(ctx, x, y, r, ky, col, a) { ctx.save(); ctx.translate(x, y); ctx.scale(1, ky); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.45, rgba(col, a * 0.45)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.restore(); }
function noiseCanvas(key, W, H, fn) { if (noiseCache[key]) return noiseCache[key]; const c = document.createElement('canvas'); c.width = W; c.height = H; fn(c.getContext('2d'), W, H); noiseCache[key] = c; return c; }

function common(S) {
  S.text = S.text || function (ctx, str, x, y, fs, color, o) {
    ctx.font = `${S.font.weight} ${fs}px ${S.font.family}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  };
  S.signature = S.signature || function (ctx, x, y, fs, vis, kin) {
    ctx.save();
    const f = `${S.sigFont || S.font.weight + ' ' + Math.round(fs) + 'px ' + S.font.family}`;
    ctx.font = f.replace('$FS', Math.round(fs)); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const a = ctx.measureText('newbeer'), b = ctx.measureText('.'), c = ctx.measureText('lee');
    const w = a.width + b.width + c.width, x0 = x - w;
    ctx.beginPath(); ctx.rect(x0 - 4, y - fs * 1.3, (w + 8) * vis, fs * 1.8); ctx.clip();
    ctx.globalAlpha = S.c.sigA;
    ctx.fillStyle = S.c.sig; ctx.fillText('newbeer', x0, y);
    ctx.fillStyle = S.c.accent; ctx.fillText('.', x0 + a.width, y);
    ctx.fillStyle = S.c.sig; ctx.fillText('lee', x0 + a.width + b.width, y);
    ctx.restore();
  };
  S.underline = S.underline || function (ctx, x, y, w, th) { ctx.fillStyle = S.c.accent; ctx.fillRect(x, y - th / 2, w, th); };
  S.cursor = S.cursor || function (ctx, x, y, w, h) { ctx.fillStyle = S.c.accent; ctx.fillRect(x, y, w, h); };
  return S;
}

const SKINS = {};
// ① 像素 RPG（复刻 v7：Fusion Pixel 12px、深紫底+下方抖动噪点、钢轨灰框、琥珀选中线、黄 #FFE859）
SKINS.pixel = common({
  name: '像素RPG', font: { family: "'FusionPixel'", weight: 400, quant: 12, track: 0.06 },
  text(ctx, str, x, y, fs, color, o) {   // v2：1 像素单位暗描边 + 右下 1×2 单位硬投影 + 上白下奶油两段填充（海报像素字）
    ctx.font = `400 ${fs}px 'FusionPixel'`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (0.06 * fs) + 'px';
    if (o.flat) { ctx.fillStyle = color; ctx.fillText(str, x, y); return; }
    const u = fs / 12, ol = this.c.outline;
    ctx.fillStyle = ol; ctx.fillText(str, x + u, y + 2 * u);
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) ctx.fillText(str, x + dx * u, y + dy * u);
    const c = toHex(color), g = ctx.createLinearGradient(0, y - 0.5 * fs, 0, y + 0.5 * fs);
    const lo = o.lock ? mix(c, '#FF9E2C', 0.45) : mix(c, '#FFD98A', 0.55);
    g.addColorStop(0, c); g.addColorStop(0.56, c); g.addColorStop(0.56, lo); g.addColorStop(1, lo);   // 硬分界，不做平滑
    ctx.fillStyle = g; ctx.fillText(str, x, y);
  },
  c: { outline: '#120A16', bg0: '#1C141D', bg1: '#2C212B', text: '#FFFFFF', heat: '#FFE2A0', lock: '#FFE859', lockHot: '#FFFFFF', accent: '#E8A03C', accentTop: '#D19238', accentBot: '#FFC964', bandFillA: 0.06,
       box: '#292C40', rail: ['#3A3F50', '#C9CEDB', '#8D93A6', '#2A2E3A'], cap: '#3A3F50', capHi: '#9AA0B0', capLo: '#15171F', flash: '#FFFFFF', ring: '#FFE859', particle: '#FFE859', halo: '#FFD23A', sig: '#B9B2C6', sigA: 0.6, sub: '#FFFFFF', chromaA: '#FF3B6B', chromaB: '#3BD8FF' },
  bg(ctx, W, H, t, fi, sx, sy) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, this.c.bg0); g.addColorStop(1, this.c.bg1);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const u = Math.round(6 * Math.min(W, H) / 1080);
    const n = noiseCanvas('px' + W + 'x' + H, W + 48, H + 48, (c, w, h) => { const r = mulberry32(7); for (let y = 0; y < h; y += u) for (let x = 0; x < w; x += u) { const d = Math.max(0, (y / h - 0.6) / 0.4); if (r() < 0.10 + 0.45 * d) { c.fillStyle = `rgba(120,100,120,${0.25 + 0.35 * r()})`; c.fillRect(x, y, u, u); } } });
    const dx = Math.round(Math.sin(t * 2 * Math.PI / 6) * 4 / u) * u;   // 环境层：缓慢漂移 4px
    ctx.drawImage(n, -24 + dx + Math.round(sx), -24 + Math.round(sy));
  },
  halo(ctx, x, y, r, a) {   // 像素：三圈阶梯椭圆光晕（15px 块，不做平滑渐变）
    const u = 15; ctx.fillStyle = this.c.halo;
    for (let i = 3; i >= 1; i--) { ctx.globalAlpha = a * 0.30 * (4 - i) / 3; const rx = r * i / 3, ry = rx * 0.45;
      for (let yy = -Math.floor(ry / u) * u; yy <= ry; yy += u) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) / u) * u; if (hw > 0) ctx.fillRect(Math.round(x / u) * u - hw, Math.round(y / u) * u + yy, hw * 2, u); } }
    ctx.globalAlpha = 1;
  },
  boxFill(ctx, x, y, w, h, a) { ctx.globalAlpha = a; ctx.fillStyle = this.c.box; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; },
  band(ctx, x, y, w, h, la, fa, flash, e) {
    ctx.fillStyle = rgba(this.c.accent, fa); ctx.fillRect(x, y, w, h);
    const th = Math.max(3, Math.round(h / 70));
    ctx.globalAlpha = la * Math.min(1, e * 2); ctx.fillStyle = flash ? this.c.lock : this.c.accentTop; ctx.fillRect(x, y, w, th);
    ctx.fillStyle = flash ? this.c.lock : this.c.accentBot; ctx.fillRect(x, y + h - th, w, th); ctx.globalAlpha = 1;
  },
  rails(ctx, x, y, w, h, rw, ch, a, off, sc) {
    ctx.globalAlpha = a; const R = this.c.rail;
    for (const [rx, dir] of [[x - rw - off, -1], [x + w + off, 1]]) {
      const g = ctx.createLinearGradient(rx, 0, rx + rw, 0); g.addColorStop(0, R[0]); g.addColorStop(0.35, R[1]); g.addColorStop(0.6, R[2]); g.addColorStop(1, R[3]);
      ctx.fillStyle = g; ctx.fillRect(rx, y, rw, h);
    }
    for (const [cy, dir] of [[y - ch - off, -1], [y + h + off, 1]]) {
      const cx = x - rw - 8 * sc, cw = w + 2 * rw + 16 * sc;
      ctx.fillStyle = this.c.cap; ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = this.c.capHi; ctx.fillRect(cx, cy, cw, Math.max(2, 2 * sc));
      ctx.fillStyle = this.c.capLo; ctx.fillRect(cx, cy + ch - Math.max(2, 2 * sc), cw, Math.max(2, 2 * sc));
      ctx.fillStyle = this.c.capHi; const rv = 6 * sc; ctx.fillRect(cx + 12 * sc, cy + ch / 2 - rv / 2, rv, rv); ctx.fillRect(cx + cw - 12 * sc - rv, cy + ch / 2 - rv / 2, rv, rv);
    }
    ctx.globalAlpha = 1;
  },
  ring(ctx, x, y, w, h, a, lw) { ctx.globalAlpha = a; ctx.strokeStyle = this.c.ring; ctx.lineWidth = Math.max(3, Math.round(lw)); ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); ctx.globalAlpha = 1; },
  particle(ctx, x, y, s, a) { ctx.globalAlpha = a; ctx.fillStyle = this.c.particle; const q = Math.max(6, Math.round(s / 6) * 6); ctx.fillRect(Math.round(x / 6) * 6 - q / 2, Math.round(y / 6) * 6 - q / 2, q, q); ctx.globalAlpha = 1; },
});

// ② 扁平卡通厚描边（ZCOOL KuaiLe，奶油底，深紫粗描边 + 实心偏移投影，糖果色导轨）
SKINS.cartoon = common({
  name: '扁平卡通', font: { family: "'KuaiLe'", weight: 400, track: 0 },
  c: { bg0: '#FFE9C7', bg1: '#FFD9A8', text: '#4CC6FF', heat: '#FFFFFF', lock: '#FFD23F', lockHot: '#FFFFFF', accent: '#FF7A3D', accentTop: '#FF7A3D', accentBot: '#FF7A3D', bandFillA: 0.14,
       box: '#FFFFFF', outline: '#1E1236', rail: ['#6C5CE7', '#A99BFF', '#6C5CE7', '#4B3CC4'], cap: '#FF5A8A', capHi: '#FF9DBA', capLo: '#2B1B3F', flash: '#FFFFFF', ring: '#2B1B3F', particle: '#FF5A8A', halo: '#FFF3A0', sig: '#2B1B3F', sigA: 0.55, sub: '#FFFFFF', chromaA: '#FF5A8A', chromaB: '#3EC7FF', chromaOp: 'source-over' },
  bg(ctx, W, H, t, fi, sx, sy) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, this.c.bg0); g.addColorStop(1, this.c.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H) / 1080, step = 72 * s, dx = (t * 10 * s) % step;  // 环境层：圆点阵缓慢平移 10px/s
    ctx.fillStyle = 'rgba(255,160,90,0.18)';
    for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) { ctx.beginPath(); ctx.arc(x + dx + sx + ((y / step) % 2 ? step / 2 : 0), y + sy, 7 * s, 0, 7); ctx.fill(); }
  },
  text(ctx, str, x, y, fs, color, o) {   // v2：0.16FS 深紫描边 + 0.06/0.08FS 实心投影 + 糖果蓝竖向渐变（锁定字黄橙渐变）
    ctx.font = `400 ${fs}px 'KuaiLe'`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (0.02 * fs) + 'px';
    if (o.flat) { ctx.fillStyle = color; ctx.fillText(str, x, y); return; }
    const ol = this.c.outline;
    ctx.lineWidth = 0.16 * fs; ctx.strokeStyle = ol; ctx.fillStyle = ol;
    ctx.strokeText(str, x + 0.06 * fs, y + 0.08 * fs); ctx.fillText(str, x + 0.06 * fs, y + 0.08 * fs);
    ctx.strokeText(str, x, y);
    const g = ctx.createLinearGradient(0, y - 0.45 * fs, 0, y + 0.45 * fs), h = o.heat || 0;
    if (o.lock) { const c = toHex(color); g.addColorStop(0, mix(c, '#FFFFFF', 0.35)); g.addColorStop(0.5, c); g.addColorStop(1, mix(c, '#FF8A00', 0.55)); }
    else { g.addColorStop(0, mix('#A6F0FF', '#FFFFFF', h)); g.addColorStop(0.5, mix('#4CC6FF', '#FFFFFF', h * 0.6)); g.addColorStop(1, mix('#1E8CFF', '#FFFFFF', h * 0.3)); }
    ctx.fillStyle = g; ctx.fillText(str, x, y);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.rect(x, y - 0.42 * fs, ctx.measureText(str).width, 0.10 * fs); ctx.clip(); ctx.fillText(str, x, y); ctx.restore();   // 顶部高光条
  },
  halo(ctx, x, y, r, a) { ctx.globalAlpha = a; ctx.fillStyle = this.c.halo; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; },
  boxFill(ctx, x, y, w, h, a) { ctx.globalAlpha = a; const r = Math.min(28, h / 4); ctx.fillStyle = this.c.box; ctx.strokeStyle = this.c.outline; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; },
  band(ctx, x, y, w, h, la, fa, flash, e) {
    ctx.fillStyle = rgba(this.c.accent, fa); ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(18, h / 3)); ctx.fill();
    ctx.globalAlpha = la * Math.min(1, e * 2); ctx.strokeStyle = flash ? this.c.lock : this.c.accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, Math.min(16, h / 3)); ctx.stroke(); ctx.globalAlpha = 1;
  },
  rails(ctx, x, y, w, h, rw, ch, a, off, sc) {
    ctx.globalAlpha = a; ctx.lineWidth = 6 * sc; ctx.strokeStyle = this.c.outline; const rwx = rw * 1.6;
    for (const rx of [x - rwx - 6 * sc - off, x + w + 6 * sc + off]) { ctx.fillStyle = this.c.rail[1]; ctx.beginPath(); ctx.roundRect(rx, y, rwx, h, rwx / 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(rx + rwx * 0.25, y + 16 * sc, rwx * 0.18, h - 32 * sc); }
    for (const cy of [y - ch * 1.3 - off, y + h + off]) { const cx = x - rwx - 16 * sc, cw = w + 2 * rwx + 32 * sc; ctx.fillStyle = this.c.cap; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch * 1.3, ch * 0.65); ctx.fill(); ctx.stroke(); ctx.fillStyle = this.c.capHi; ctx.beginPath(); ctx.arc(cx + 22 * sc, cy + ch * 0.65, 6 * sc, 0, 7); ctx.arc(cx + cw - 22 * sc, cy + ch * 0.65, 6 * sc, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  },
  ring(ctx, x, y, w, h, a, lw) { ctx.globalAlpha = a; ctx.strokeStyle = this.c.ring; ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 24); ctx.stroke(); ctx.globalAlpha = 1; },
  particle(ctx, x, y, s, a, ang) { ctx.globalAlpha = a; ctx.fillStyle = this.c.particle; ctx.strokeStyle = this.c.outline; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s * 1.1, q = ang + i * Math.PI / 5; ctx.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; },
  cursor(ctx, x, y, w, h) { ctx.fillStyle = this.c.accent; ctx.strokeStyle = this.c.outline; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x, y, w * 1.3, h, w * 0.5); ctx.fill(); if (h > 8) ctx.stroke(); },
  underline(ctx, x, y, w, th) { ctx.fillStyle = this.c.accent; ctx.strokeStyle = this.c.outline; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x, y - th, w, th * 2, th); ctx.fill(); if (w > 10) ctx.stroke(); },
  sigFont: "400 $FSpx 'KuaiLe'",
});

// ③ 深色微光数据风（Noto Sans CJK SC Bold，近黑蓝底+网格+扫描线，青色霓虹，玻璃框）
SKINS.data = common({
  name: '深色微光数据', font: { family: "'Smiley'", weight: 400, track: 0.03, overhang: 0.10 },
  c: { bg0: '#05080F', bg1: '#0A1220', text: '#F2FAFF', heat: '#B8F6FF', lock: '#FFD95A', lockHot: '#FFFFFF', accent: '#3FD0FF', accentTop: '#3FD0FF', accentBot: '#3FD0FF', bandFillA: 0.10,
       box: '#0A1626', rail: ['#0A3550', '#7BE6FF', '#1E7FB0', '#0A2030'], cap: '#0D2236', capHi: '#3FD0FF', capLo: '#02060C', flash: '#BFF4FF', ring: '#3FD0FF', particle: '#FFD95A', halo: '#FFC93A', sig: '#7FA6C8', sigA: 0.6, sub: '#DDEBFF', chromaA: '#FF2E6E', chromaB: '#2EE6FF', glow: '#3FD0FF' },
  bg(ctx, W, H, t, fi, sx, sy) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); g.addColorStop(0, this.c.bg1); g.addColorStop(1, this.c.bg0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H) / 1080, step = 60 * s, dy = (t * 12 * s) % step;   // 环境层：网格上移 12px/s
    ctx.strokeStyle = 'rgba(63,208,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = (sx % step); x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = -dy + sy; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
  },
  text(ctx, str, x, y, fs, color, o) {   // v2：得意黑 Smiley Sans（斜体展示字）+ 双层霓虹（0.24FS 外辉 + 0.06FS 内辉）+ 0.022FS 亮青描边
    ctx.font = `400 ${fs}px 'Smiley'`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (0.03 * fs) + 'px';
    if (o.flat) { ctx.fillStyle = color; ctx.fillText(str, x, y); return; }
    const glow = o.lock ? 'rgba(255,190,40,' : 'rgba(63,208,255,';
    ctx.fillStyle = color;
    ctx.shadowColor = glow + '0.95)'; ctx.shadowBlur = 0.24 * fs; ctx.fillText(str, x, y);
    ctx.shadowColor = glow + '1)'; ctx.shadowBlur = 0.06 * fs; ctx.fillText(str, x, y);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.lineWidth = 0.022 * fs; ctx.strokeStyle = o.lock ? '#FFF1B0' : '#8FF0FF'; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  },
  halo(ctx, x, y, r, a) { softHalo(ctx, x, y, r, 0.55, this.c.halo, a); },
  boxFill(ctx, x, y, w, h, a) { ctx.globalAlpha = a * 0.88; ctx.fillStyle = this.c.box; ctx.fillRect(x, y, w, h); ctx.globalAlpha = a * 0.6; ctx.strokeStyle = this.c.accent; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.globalAlpha = 1; },
  band(ctx, x, y, w, h, la, fa, flash, e) {
    ctx.fillStyle = rgba(this.c.accent, fa); ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = la * Math.min(1, e * 2); ctx.fillStyle = flash ? this.c.lock : this.c.accent; ctx.shadowColor = this.c.accent; ctx.shadowBlur = 12;
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
    const tk = 14; ctx.fillRect(x, y, 2, tk); ctx.fillRect(x + w - 2, y, 2, tk); ctx.fillRect(x, y + h - tk, 2, tk); ctx.fillRect(x + w - 2, y + h - tk, 2, tk);   // 角标
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  },
  rails(ctx, x, y, w, h, rw, ch, a, off, sc) {
    ctx.globalAlpha = a; ctx.shadowColor = this.c.accent; ctx.shadowBlur = 14 * sc; const R = this.c.rail, rw2 = Math.max(4, rw * 0.5);
    for (const rx of [x - rw2 - 6 * sc - off, x + w + 6 * sc + off]) { const g = ctx.createLinearGradient(rx, 0, rx + rw2, 0); g.addColorStop(0, R[0]); g.addColorStop(0.4, R[1]); g.addColorStop(1, R[3]); ctx.fillStyle = g; ctx.fillRect(rx, y, rw2, h); }
    ctx.shadowBlur = 0;
    for (const cy of [y - ch * 0.5 - off, y + h + off]) { const cx = x - rw2 - 14 * sc, cw = w + 2 * rw2 + 28 * sc; ctx.fillStyle = this.c.cap; ctx.fillRect(cx, cy, cw, ch * 0.5); ctx.fillStyle = this.c.capHi; ctx.fillRect(cx, cy, cw, 1.5); for (let i = 0; i < 6; i++) ctx.fillRect(cx + 10 * sc + i * 10 * sc, cy + ch * 0.25 - 1, 5 * sc, 2); }
    ctx.globalAlpha = 1;
  },
  ring(ctx, x, y, w, h, a, lw) { ctx.globalAlpha = a; ctx.strokeStyle = this.c.ring; ctx.shadowColor = this.c.ring; ctx.shadowBlur = 16; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0; ctx.globalAlpha = 1; },
  particle(ctx, x, y, s, a, ang) { ctx.globalAlpha = a; ctx.strokeStyle = this.c.particle; ctx.lineWidth = Math.max(2, s * 0.25); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * s * 2.2, y - Math.sin(ang) * s * 2.2); ctx.stroke(); ctx.globalAlpha = 1; },
  post(ctx, W, H) { ctx.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1); },
  sigFont: "500 $FSpx 'Noto Sans Mono CJK SC'",
});

// ④ 写实 / 电影感衬线（Noto Serif CJK SC Bold，暖黑底+暗角+胶片颗粒，象牙白字，黄铜导轨，金色锁定）
SKINS.cinema = common({
  name: '电影衬线', font: { family: "'NotoSerifBlack'", weight: 900, track: 0.04 },
  c: { bg0: '#16110D', bg1: '#070504', text: '#F6EEDD', heat: '#FFE3A8', lock: '#F2C45A', lockHot: '#FFF7E6', accent: '#C9A24A', accentTop: '#C9A24A', accentBot: '#C9A24A', bandFillA: 0.07,
       box: '#1A1511', rail: ['#3A2C18', '#E8CF94', '#8A6A38', '#2A1E10'], cap: '#2A2016', capHi: '#D9BE82', capLo: '#050302', flash: '#FFF2DC', ring: '#E8CF94', particle: '#FFE2A0', halo: '#F2B54A', sig: '#BFAF96', sigA: 0.6, sub: '#E8DFCF', chromaA: '#FF4A3A', chromaB: '#3AA8FF' },
  bg(ctx, W, H, t, fi, sx, sy) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createRadialGradient(W / 2 + sx, H * 0.44 + sy, 0, W / 2, H * 0.44, Math.max(W, H) * 0.62); g.addColorStop(0, this.c.bg0); g.addColorStop(1, this.c.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  text(ctx, str, x, y, fs, color, o) {   // v2：思源宋体 Black + 深投影 + 0.03FS 金属边光描边 + 象牙竖向渐变（锁定字亮金渐变）
    ctx.font = `900 ${fs}px 'NotoSerifBlack'`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (0.04 * fs) + 'px';
    if (o.flat) { ctx.fillStyle = color; ctx.fillText(str, x, y); return; }
    ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 0.07 * fs; ctx.shadowOffsetY = 0.035 * fs; ctx.fillStyle = '#000'; ctx.fillText(str, x, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent';
    const rim = ctx.createLinearGradient(0, y - 0.5 * fs, 0, y + 0.5 * fs);
    rim.addColorStop(0, '#FFF6D2'); rim.addColorStop(0.35, '#E8C77A'); rim.addColorStop(0.65, '#8A6428'); rim.addColorStop(1, '#F0D28E');
    ctx.lineWidth = 0.03 * fs; ctx.strokeStyle = rim; ctx.strokeText(str, x, y);
    const c = toHex(color), g = ctx.createLinearGradient(0, y - 0.45 * fs, 0, y + 0.45 * fs);
    if (o.lock && (o.lockK || 0) > 0.5) { g.addColorStop(0, '#FFFBE6'); g.addColorStop(0.45, mix(c, '#FFE9A8', 0.4)); g.addColorStop(1, '#E0A43C'); ctx.shadowColor = 'rgba(255,196,80,0.85)'; ctx.shadowBlur = 0.14 * fs; }
    else { g.addColorStop(0, mix(c, '#FFFFFF', 0.6)); g.addColorStop(0.55, c); g.addColorStop(1, mix(c, '#9C8A6E', 0.45)); }
    ctx.fillStyle = g; ctx.fillText(str, x, y); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  },
  halo(ctx, x, y, r, a) { softHalo(ctx, x, y, r * 1.1, 0.5, this.c.halo, a * 0.8); },
  boxFill(ctx, x, y, w, h, a) { ctx.globalAlpha = a * 0.78; ctx.fillStyle = this.c.box; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; },
  band(ctx, x, y, w, h, la, fa, flash, e) {
    ctx.fillStyle = rgba(this.c.accent, fa); ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = la * Math.min(1, e * 2); ctx.fillStyle = flash ? this.c.lock : this.c.accent; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.globalAlpha = 1;
  },
  rails(ctx, x, y, w, h, rw, ch, a, off, sc) {
    ctx.globalAlpha = a; const R = this.c.rail, rw2 = rw * 0.8;
    for (const rx of [x - rw2 - off, x + w + off]) { const g = ctx.createLinearGradient(rx, 0, rx + rw2, 0); g.addColorStop(0, R[0]); g.addColorStop(0.35, R[1]); g.addColorStop(0.65, R[2]); g.addColorStop(1, R[3]); ctx.fillStyle = g; ctx.fillRect(rx, y, rw2, h); }
    for (const cy of [y - ch - off, y + h + off]) { const cx = x - rw2 - 10 * sc, cw = w + 2 * rw2 + 20 * sc; const g = ctx.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, this.c.capHi); g.addColorStop(0.25, R[2]); g.addColorStop(1, this.c.capLo); ctx.fillStyle = g; ctx.fillRect(cx, cy, cw, ch); }
    ctx.globalAlpha = 1;
  },
  ring(ctx, x, y, w, h, a, lw) { ctx.globalAlpha = a * 0.8; ctx.strokeStyle = this.c.ring; ctx.lineWidth = lw * 0.75; ctx.strokeRect(x, y, w, h); ctx.globalAlpha = 1; },
  particle(ctx, x, y, s, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.9); g.addColorStop(0, rgba(this.c.particle, a * 0.9)); g.addColorStop(1, rgba(this.c.particle, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 0.9, 0, 7); ctx.fill(); },
  post(ctx, W, H, t, fi) {
    const n = noiseCanvas('grain' + W, 512, 512, (c, w, h) => { const im = c.createImageData(w, h), r = mulberry32(3); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); });
    const r = mulberry32(1000 + fi), ox = -Math.floor(r() * 512), oy = -Math.floor(r() * 512);
    ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(n, 'repeat'); ctx.translate(ox, oy); ctx.fillRect(-ox, -oy, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  },
  sigFont: "400 $FSpx 'Noto Serif CJK SC'",
});
window.SKINS = SKINS;
})();
