// Figure 1: gradient descent–ascent with Halpern anchoring, on a bilinear problem (spec: 02_Figure_specs.md).
// Algorithm 1 of [2] without noise. Click sets z0 and restarts; Enter/Space replays.
import { runFigure1, DEFAULT_Z0, T1, BLUE_DOT_TS } from './math.js';
import { readTokens, fitCanvas, reducedMotion, onFirstView, onRedrawNeeded, onActivateKey } from './shared.js';

const XR = 1.6; // x from −1.6 to 1.6
const YR = 1.2; // y from −1.2 to 1.2
const DURATION = 2600; // ms
// Both methods run for the same 4^10 steps. (The spec stopped the orange path after two turns, at
// t = 336; the owner chose the full run, so the orange circle keeps going about 20 times around.)
const ORANGE_TURNS = Infinity;
// Dots mark iterations: blue at t = 4^k (11 dots), orange at t = 2^k (21 dots, k = 0..20).
const ORANGE_DOT_TS = Array.from({ length: 21 }, (_, k) => 2 ** k);
const easeOut = u => 1 - (1 - u) * (1 - u);

export function initFigure1(figure) {
  const canvas = figure.querySelector('canvas');
  let z0 = DEFAULT_Z0.slice();
  let paths = null; // screen-space paths for the current size and z0
  let progress = 1; // 0..1 along the log time scale; drawn complete at rest
  let raf = 0;

  // Run both methods and keep, for drawing, every iterate at least 1 px from the previous kept one.
  function compute(w, h) {
    const X = x => ((x + XR) / (2 * XR)) * w;
    const Y = y => h - ((y + YR) / (2 * YR)) * h;
    const thinPath = () => ({ xs: [], ys: [], ts: [], lx: 0, ly: 0 });
    const keep = (p, t, px, py, force) => {
      if (force || p.ts.length === 0 || Math.hypot(px - p.lx, py - p.ly) >= 1) {
        p.xs.push(px);
        p.ys.push(py);
        p.ts.push(t);
        p.lx = px;
        p.ly = py;
        return true;
      }
      return false;
    };
    const anchored = thinPath();
    const gda = thinPath();
    const blueDots = [];
    let nextDot = 0;
    let nextOrangeDot = 0;
    const orangeDots = [];
    let gLast = null;
    const { cut } = runFigure1(
      z0,
      (t, x, y) => {
        const px = X(x);
        const py = Y(y);
        keep(anchored, t, px, py, t === T1);
        if (t === BLUE_DOT_TS[nextDot]) {
          blueDots.push({ t, x: px, y: py });
          nextDot++;
        }
      },
      (t, x, y) => {
        const px = X(x);
        const py = Y(y);
        if (!keep(gda, t, px, py, false)) gLast = { t, px, py };
        else gLast = null;
        if (t === ORANGE_DOT_TS[nextOrangeDot]) {
          orangeDots.push({ t, x: px, y: py });
          nextOrangeDot++;
        }
      },
      T1,
      ORANGE_TURNS
    );
    if (gLast) keep(gda, gLast.t, gLast.px, gLast.py, true); // make sure the path ends at the cut
    for (const p of [anchored, gda]) {
      p.cum = [0];
      for (let i = 1; i < p.xs.length; i++) {
        p.cum.push(p.cum[i - 1] + Math.hypot(p.xs[i] - p.xs[i - 1], p.ys[i] - p.ys[i - 1]));
      }
    }
    paths = { w, h, X, Y, anchored, gda, cut, blueDots, orangeDots };
  }

  // Draws path p up to time tLimit (with a partial last segment); returns the drawn length in px.
  function strokePath(ctx, p, tLimit) {
    const { xs, ys, ts, cum } = p;
    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ts[mid] <= tLimit) lo = mid;
      else hi = mid - 1;
    }
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i <= lo; i++) ctx.lineTo(xs[i], ys[i]);
    let length = cum[lo];
    if (lo + 1 < ts.length && tLimit > ts[lo]) {
      const f = (tLimit - ts[lo]) / (ts[lo + 1] - ts[lo]);
      ctx.lineTo(xs[lo] + f * (xs[lo + 1] - xs[lo]), ys[lo] + f * (ys[lo + 1] - ys[lo]));
      length += f * (cum[lo + 1] - cum[lo]);
    }
    ctx.stroke();
    return length;
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    if (!w) return;
    if (!paths || paths.w !== w || paths.h !== h) compute(w, h);
    const k = readTokens(canvas);
    const { X, Y } = paths;

    ctx.fillStyle = k.surface;
    ctx.fillRect(0, 0, w, h);

    // grid every 0.5
    ctx.lineWidth = 1;
    ctx.strokeStyle = k.rule;
    for (let v = -1.5; v <= 1.5001; v += 0.5) {
      ctx.beginPath();
      ctx.moveTo(Math.round(X(v)) + 0.5, 0);
      ctx.lineTo(Math.round(X(v)) + 0.5, h);
      ctx.stroke();
    }
    for (let v = -1; v <= 1.0001; v += 0.5) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(Y(v)) + 0.5);
      ctx.lineTo(w, Math.round(Y(v)) + 0.5);
      ctx.stroke();
    }
    // faint axes through the origin
    ctx.strokeStyle = k.ink3;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(Y(0)) + 0.5);
    ctx.lineTo(w, Math.round(Y(0)) + 0.5);
    ctx.moveTo(Math.round(X(0)) + 0.5, 0);
    ctx.lineTo(Math.round(X(0)) + 0.5, h);
    ctx.stroke();
    // faint direction field of −G(z) = (−y, x)
    ctx.globalAlpha = 0.35;
    for (let i = 0; i <= 16; i++) {
      for (let j = 0; j <= 12; j++) {
        const x = -XR + (i / 16) * 2 * XR;
        const y = -YR + (j / 12) * 2 * YR;
        const m = Math.hypot(x, y);
        if (m < 1e-6) continue;
        const len = Math.min(9, 3 + m * 5);
        const ux = (-y / m) * len;
        const uy = (-x / m) * len;
        ctx.beginPath();
        ctx.moveTo(X(x) - ux / 2, Y(y) - uy / 2);
        ctx.lineTo(X(x) + ux / 2, Y(y) + uy / 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // iterates up to t = (T + 1)^p − 1 (log time scale)
    const tNow = Math.pow(T1 + 1, progress) - 1;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = 'round';

    ctx.strokeStyle = k.diverge;
    ctx.fillStyle = k.diverge;
    const tOrange = Math.min(tNow, paths.cut);
    strokePath(ctx, paths.gda, tOrange);
    for (const d of paths.orangeDots) {
      if (d.t > tOrange + 1e-6) break;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = k.accent;
    ctx.fillStyle = k.accent;
    strokePath(ctx, paths.anchored, tNow);
    for (const d of paths.blueDots) {
      if (d.t > tNow + 1e-6) break;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // markers: z* hollow circle, z0 hollow square
    ctx.strokeStyle = k.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(0), Y(0), 5, 0, Math.PI * 2);
    ctx.stroke();
    const sx = X(z0[0]);
    const sy = Y(z0[1]);
    ctx.fillStyle = k.surface;
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.strokeRect(sx - 4, sy - 4, 8, 8);

    // labels in math italic
    ctx.fillStyle = k.ink;
    ctx.font = `italic 15px ${k.math}`;
    ctx.textBaseline = 'middle';
    // z* label goes on the side away from where the blue path arrives (bottom-right for the default start)
    const near = paths.blueDots[6] || paths.blueDots[paths.blueDots.length - 1];
    const lx = near && near.x > X(0) + 0.5 ? -1 : 1;
    const ly = near && near.y > Y(0) + 0.5 ? -1 : 1;
    ctx.textAlign = lx > 0 ? 'left' : 'right';
    ctx.fillText('z*', X(0) + 9 * lx, Y(0) + 12 * ly);
    ctx.textAlign = 'left';
    ctx.fillText('z', sx + 9, sy - 9);
    ctx.font = `11px ${k.math}`;
    ctx.fillText('0', sx + 16, sy - 5);
    ctx.fillStyle = k.ink2;
    ctx.font = `italic 14px ${k.math}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillText('x', w - 8, Y(0) - 7);
    ctx.textAlign = 'left';
    ctx.fillText('y', X(0) + 7, 16);
  }

  function play() {
    cancelAnimationFrame(raf);
    if (reducedMotion()) {
      progress = 1;
      draw();
      return;
    }
    const start = performance.now();
    const tick = now => {
      const u = Math.max(0, Math.min(1, (now - start) / DURATION));
      progress = easeOut(u);
      draw();
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    progress = 0;
    draw();
    raf = requestAnimationFrame(tick);
  }

  // Click (or tap): start both methods from the clicked point, with the usual clamping.
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 2 * XR - XR;
    let y = YR - ((e.clientY - rect.top) / rect.height) * 2 * YR;
    const r = Math.hypot(x, y);
    if (r > 0.85) {
      x = (x / r) * 0.85;
      y = (y / r) * 0.85;
    }
    if (r < 0.15) {
      const s = 0.15 / Math.max(r, 1e-6);
      x *= s;
      y *= s;
    }
    z0 = [x, y];
    paths = null;
    play();
  });
  onActivateKey(canvas, play); // keyboard: replay from the current z0

  figure.hidden = false;
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1));
  idle(() => draw(), { timeout: 400 });
  onRedrawNeeded(canvas, reason => {
    if (reason === 'resize') paths = null;
    draw();
  });
  onFirstView(canvas, play);
}
