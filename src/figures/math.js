// Pure maths for the two figures (no DOM), so the check numbers in the figure spec can be tested in Node.

// ---------------------------------------------------------------------------------------------
// Figure 1: Algorithm 1 of [2] without noise, on min_x max_y xy (unconstrained, z* = 0).
//   G(z) = (y, -x)
//   anchored:        z_{t+1} = (1 - β_t) z_t + β_t z_0 - η_t G(z_t)
//   descent–ascent:  z_{t+1} = z_t - η_t G(z_t)
//   β_t = 2 / (t + 2),  η_t = 1 / (t + 2)^{3/4}   (a = 2, H = L = 1, B = 0)
// ---------------------------------------------------------------------------------------------

export const T1 = 4 ** 10; // 1,048,576 steps: long enough for the anchored path to reach the z* marker
export const DEFAULT_Z0 = [0.62, 0.38];
export const TURNS = 2; // the descent–ascent path is drawn until it has gone twice around z*
export const BLUE_DOT_TS = Array.from({ length: 11 }, (_, k) => 4 ** k); // t = 1, 4, ..., 4^10

let tableCache = null;
export function stepTables(T = T1) {
  if (tableCache && tableCache.T === T) return tableCache;
  const eta = new Float64Array(T);
  const beta = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    eta[t] = 1 / Math.pow(t + 2, 0.75);
    beta[t] = 2 / (t + 2);
  }
  tableCache = { T, eta, beta };
  return tableCache;
}

/**
 * Runs both methods from z0.
 * visitAnchored(t, x, y) is called for t = 0..T; visitGda(t, x, y) for t = 0..cut, where cut is the
 * step at which descent–ascent completes `turns` full turns around z* (Infinity: run all T steps).
 */
export function runFigure1(z0, visitAnchored, visitGda, T = T1, turns = TURNS) {
  const { eta, beta } = stepTables(T);
  const [x0, y0] = z0;

  let ax = x0;
  let ay = y0;
  visitAnchored(0, ax, ay);
  for (let t = 0; t < T; t++) {
    const e = eta[t];
    const b = beta[t];
    const nx = (1 - b) * ax + b * x0 - e * ay; // -η G(z) = (-η y, +η x)
    const ny = (1 - b) * ay + b * y0 + e * ax;
    ax = nx;
    ay = ny;
    visitAnchored(t + 1, ax, ay);
  }

  let gx = x0;
  let gy = y0;
  let turned = 0;
  let prev = Math.atan2(gy, gx);
  let cut = T;
  visitGda(0, gx, gy);
  for (let t = 0; t < T; t++) {
    const e = eta[t];
    const nx = gx - e * gy;
    const ny = gy + e * gx;
    gx = nx;
    gy = ny;
    visitGda(t + 1, gx, gy);
    const a = Math.atan2(gy, gx);
    let d = a - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    turned += Math.abs(d);
    prev = a;
    if (turned >= turns * 2 * Math.PI) {
      cut = t + 1;
      break;
    }
  }
  return { cut };
}

// ---------------------------------------------------------------------------------------------
// Figure 2: backtracking (Armijo) line search along one search direction. An illustration, not
// the method of [3]. Both curves are cubic splines (first derivative fixed at η = 0, second
// derivative zero at the right end). One unit of η is the first trial step η0.
// ---------------------------------------------------------------------------------------------

export function clampedNaturalSpline(xs, ys, d0) {
  const n = xs.length - 1;
  const h = [];
  for (let i = 0; i < n; i++) h.push(xs[i + 1] - xs[i]);
  const A = new Array(n + 1).fill(0);
  const B = new Array(n + 1).fill(0);
  const C = new Array(n + 1).fill(0);
  const D = new Array(n + 1).fill(0);
  B[0] = 2 * h[0];
  C[0] = h[0];
  D[0] = 6 * ((ys[1] - ys[0]) / h[0] - d0);
  for (let i = 1; i < n; i++) {
    A[i] = h[i - 1];
    B[i] = 2 * (h[i - 1] + h[i]);
    C[i] = h[i];
    D[i] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]);
  }
  B[n] = 1; // natural right end: M_n = 0
  for (let i = 1; i <= n; i++) {
    const m = A[i] / B[i - 1];
    B[i] -= m * C[i - 1];
    D[i] -= m * D[i - 1];
  }
  const M = new Array(n + 1).fill(0);
  M[n] = D[n] / B[n];
  for (let i = n - 1; i >= 0; i--) M[i] = (D[i] - C[i] * M[i + 1]) / B[i];
  return v => {
    let i = 0;
    while (i < n - 1 && v > xs[i + 1]) i++;
    const hi = h[i];
    const a = xs[i + 1] - v;
    const b = v - xs[i];
    return (
      (M[i] * a * a * a) / (6 * hi) +
      (M[i + 1] * b * b * b) / (6 * hi) +
      (ys[i] / hi - (M[i] * hi) / 6) * a +
      (ys[i + 1] / hi - (M[i + 1] * hi) / 6) * b
    );
  };
}

const FULL_KNOTS = [
  [0, 0], [0.1, -0.1], [0.2, -0.33], [0.3, -0.56], [0.42, -0.66], [0.52, -0.62],
  [0.6, -0.55], [0.72, -0.66], [0.86, -0.78], [0.97, -0.77], [1.08, -0.72]
];
const SAMPLED_KNOTS = [
  [0, 0], [0.06, -0.13], [0.14, -0.28], [0.25, -0.43], [0.36, -0.53], [0.46, -0.57],
  [0.56, -0.58], [0.66, -0.66], [0.8, -0.82], [0.9, -0.8], [1.0, -0.76], [1.08, -0.8]
];

export const FIG2 = {
  etaMax: 1.08,
  yMin: -0.95,
  yMax: 0.06,
  c: 0.5,
  slope0: -2.4, // φ'(0) of the sampled objective
  shrink: 0.6
};
FIG2.armijoSlope = FIG2.c * FIG2.slope0; // -1.2

export const fullObjective = clampedNaturalSpline(FULL_KNOTS.map(p => p[0]), FULL_KNOTS.map(p => p[1]), -0.6);
export const sampledObjective = clampedNaturalSpline(
  SAMPLED_KNOTS.map(p => p[0]),
  SAMPLED_KNOTS.map(p => p[1]),
  FIG2.slope0
);

/**
 * Trial steps η0, 0.6η0, ... until the Armijo test on the sampled objective passes:
 * φ(η) ≤ φ(0) + c η φ'(0). The default c = 0.5 is the spec's run.
 */
export function backtrackingTrials(c = FIG2.c) {
  const trials = [];
  const slope = c * FIG2.slope0;
  let e = 1;
  for (let i = 0; i < 10; i++) {
    const value = sampledObjective(e);
    const armijo = slope * e;
    const accepted = value <= armijo;
    trials.push({ eta: e, value, armijo, accepted });
    if (accepted) break;
    e *= FIG2.shrink;
  }
  return trials;
}

// A click draws a new Armijo constant from this range, and the real Armijo test decides each trial.
// Outcomes: c ≤ 0.317 would accept η0 at once, so the range starts above it (every click shows at
// least one rejection); up to 0.418 rejects η0 and accepts 0.6η0; up to 0.613 rejects two and
// accepts 0.36η0 (the spec's c = 0.5). Above 0.6 a fourth trial at 0.216η0 would put its label on
// top of its neighbour's, so the range stops there.
export const ARMIJO_C_RANGE = [0.33, 0.6];
// A drawn c is skipped if any trial lands within this distance of the Armijo line, so a marker
// never sits on the line and its accept/reject is always visible.
export const ARMIJO_MIN_GAP = 0.03;

/**
 * Timeline in ms (spec): curves 0–300; trial at η0 300–550, evaluated at 900; slide to 0.6η0
 * 1050–1700, evaluated at 2050; slide to 0.36η0 2200–2850, evaluated at 3200; update 3450–3850.
 */
export function figure2Timeline(trials) {
  let t = 300;
  const events = trials.map((_, i) => {
    const slideStart = t;
    const slideEnd = i === 0 ? t + 250 : t + 650;
    const evalAt = slideEnd + 350;
    t = evalAt + 150;
    return { slideStart, slideEnd, evalAt };
  });
  const updateAt = t + 100;
  return { events, updateAt, updateFade: 400, popMs: 250, end: updateAt + 600 };
}
