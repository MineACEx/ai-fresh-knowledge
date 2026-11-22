// G2 连续曲率圆角（超椭圆）工具
// 矩形卡片用 CSS corner-shape:squircle（原生），胶囊/无独立四角的元素用本文件生成 clip-path。
// 数学：rho(φ) = r / (|cosφ|^n + |sinφ|^n)^(1/n)，n=4 为经典 squircle（G2 连续）

export const SQ_N = 4;
export const SQ_STEPS = 40;

/** 胶囊路径：左右两个超椭圆"帽" + 上下两条直线 */
export function pillPath(w, h, n = SQ_N, steps = SQ_STEPS) {
  const r = h / 2;
  if (!(w > 0) || !(h > 0)) return '';
  if (w <= h) return capCircle(w, h, n, steps); // 退化成圆形

  const cy = r;
  const cx1 = w - r; // 右帽圆心
  const cx2 = r;     // 左帽圆心

  const rho = (ph) => {
    const c = Math.abs(Math.cos(ph)), s = Math.abs(Math.sin(ph));
    return r / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
  };
  const f = (v) => (Math.round(v * 10) / 10).toFixed(1);

  let d = 'M ' + f(r) + ' 0';
  d += ' L ' + f(w - r) + ' 0';
  // 右帽 φ ∈ [-π/2, π/2]
  for (let i = 0; i <= steps; i++) {
    const ph = -Math.PI / 2 + (i / steps) * Math.PI;
    const rr = rho(ph);
    d += ' L ' + f(cx1 + rr * Math.cos(ph)) + ' ' + f(cy + rr * Math.sin(ph));
  }
  d += ' L ' + f(r) + ' ' + f(h);
  // 左帽 φ ∈ [π/2, 3π/2]
  for (let i = 0; i <= steps; i++) {
    const ph = Math.PI / 2 + (i / steps) * Math.PI;
    const rr = rho(ph);
    d += ' L ' + f(cx2 + rr * Math.cos(ph)) + ' ' + f(cy + rr * Math.sin(ph));
  }
  return 'path("' + d + ' Z")';
}

/** 宽高相等时退化为超椭圆整圆 */
function capCircle(w, h, n, steps) {
  const rx = w / 2, ry = h / 2;
  const f = (v) => (Math.round(v * 10) / 10).toFixed(1);
  let d = '';
  for (let i = 0; i <= steps * 2; i++) {
    const ph = (i / (steps * 2)) * Math.PI * 2;
    const c = Math.abs(Math.cos(ph)), s = Math.abs(Math.sin(ph));
    const k = Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
    const x = rx + (rx / k) * Math.cos(ph);
    const y = ry + (ry / k) * Math.sin(ph);
    d += (i ? ' L ' : 'M ') + f(x) + ' ' + f(y);
  }
  return 'path("' + d + ' Z")';
}

/** 把元素变成 G2 胶囊（保留 border-radius 作为不支持 clip-path 时的回退） */
export function smoothPill(el) {
  if (!el) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const p = pillPath(w, h);
  if (!p) return;
  el.style.webkitClipPath = p;
  el.style.clipPath = p;
}

/** 批量 + 尺寸变化自动重算 */
export function observePills(selector, root = document) {
  const els = [...root.querySelectorAll(selector)];
  const run = () => els.forEach(smoothPill);
  run();
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', run);
    return () => window.removeEventListener('resize', run);
  }
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) smoothPill(e.target);
  });
  els.forEach(el => ro.observe(el));
  return () => ro.disconnect();
}
