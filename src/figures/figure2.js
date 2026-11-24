// Figure 2: stochastic line search on a nonconvex problem (spec: 02_Figure_specs.md).
// Backtracking along one search direction, against the stepsize η. Plays once when scrolled
// into view with the spec's Armijo constant c = 0.5 (also after every page load); a click, Enter
// or Space replays it with a new random c from ARMIJO_C_RANGE (a new Armijo line). The real Armijo
// test decides every trial; every click shows one or two rejections before the accepted step.
import {
  FIG2,
  ARMIJO_C_RANGE,
  ARMIJO_MIN_GAP,
  fullObjective,
  sampledObjective,
  backtrackingTrials,
  figure2Timeline
} from './math.js';
import { readTokens, fitCanvas, reducedMotion, onFirstView, onRedrawNeeded, onActivateKey } from './shared.js';

const PAD = { left: 26, right: 14, top: 14, bottom: 30 };
const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/** A new Armijo constant for a click: in range, clearly different from the last one, no marker on the line. */
function pickArmijoC(previous) {
  const [lo, hi] = ARMIJO_C_RANGE;
  for (let i = 0; i < 100; i++) {
    const c = lo + Math.random() * (hi - lo);
    if (Math.abs(c - previous) < 0.04) continue;
    const trials = backtrackingTrials(c);
    if (trials.length < 2 || trials.length > 3) continue; // at least one rejection, at most two
    if (trials.every(t => Math.abs(t.value - t.armijo) >= ARMIJO_MIN_GAP)) return c;
  }
  return FIG2.c;
}

const stepName = e => (e === 1 ? 'eta zero' : `${+e.toFixed(2)} eta zero`);

/** Screen-reader description of the run that is shown. */
function describeRun(trials) {
  const rejected = trials.filter(t => !t.accepted).map(t => stepName(t.eta));
  const accepted = stepName(trials[trials.length - 1].eta);
  const middle = rejected.length
    ? `Backtracking tries ${rejected.join(' and then ')}; ${rejected.length > 1 ? 'both lie' : 'it lies'} above the Armijo line on the sampled objective and ${rejected.length > 1 ? 'are' : 'is'} rejected. The step ${accepted} lies below it and is accepted`
    : 'The first trial step, eta zero, already lies below the Armijo line on the sampled objective and is accepted';
  return `Plot of a full objective and a sampled objective along one search direction, against the stepsize eta. ${middle}, and the iterate moves to x t plus 1 on the full objective. Click the plot or press Enter to replay with a new Armijo line.`;
}

export function initFigure2(figure) {
  const canvas = figure.querySelector('canvas');
  // The first run (on scroll) uses the spec's c = 0.5; each click draws a new c.
  let c = FIG2.c;
  let TRIALS = backtrackingTrials(c);
  let TL = figure2Timeline(TRIALS);
  let ACCEPTED = TRIALS[TRIALS.length - 1].eta;
  let time = TL.end; // complete at rest
  let raf = 0;

  function setArmijoC(next) {
    c = next;
    TRIALS = backtrackingTrials(c);
    TL = figure2Timeline(TRIALS);
    ACCEPTED = TRIALS[TRIALS.length - 1].eta;
    canvas.setAttribute('aria-label', describeRun(TRIALS));
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    if (!w) return;
    const k = readTokens(canvas);
    const { etaMax, yMin, yMax } = FIG2;
    const armijoSlope = c * FIG2.slope0;
    const X = e => PAD.left + (e / etaMax) * (w - PAD.left - PAD.right);
    const Y = v => PAD.top + ((yMax - v) / (yMax - yMin)) * (h - PAD.top - PAD.bottom);
    const axisY = h - PAD.bottom + 0.5;

    ctx.fillStyle = k.surface;
    ctx.fillRect(0, 0, w, h);

    // light grid
    ctx.strokeStyle = k.rule;
    ctx.lineWidth = 1;
    for (let e = 0.2; e < etaMax; e += 0.2) {
      ctx.beginPath();
      ctx.moveTo(Math.round(X(e)) + 0.5, PAD.top);
      ctx.lineTo(Math.round(X(e)) + 0.5, h - PAD.bottom);
      ctx.stroke();
    }
    for (let v = -0.8; v < 0.01; v += 0.2) {
      ctx.beginPath();
      ctx.moveTo(PAD.left, Math.round(Y(v)) + 0.5);
      ctx.lineTo(w - PAD.right, Math.round(Y(v)) + 0.5);
      ctx.stroke();
    }
    // L-shaped axis and the η label
    ctx.strokeStyle = k.ink3;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(PAD.left + 0.5, PAD.top);
    ctx.lineTo(PAD.left + 0.5, axisY);
    ctx.lineTo(w - PAD.right, axisY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = k.ink2;
    ctx.font = `italic 14px ${k.math}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('η', w - PAD.right - 2, h - PAD.bottom - 6);
    ctx.textAlign = 'left';

    // Armijo line: φ(0) + c η φ'(0), from the start until it leaves the plot
    ctx.strokeStyle = k.ink3;
    ctx.lineWidth = 1;
    const armijoEnd = Math.min(etaMax, (yMin + 0.02) / armijoSlope);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(armijoEnd), Y(armijoSlope * armijoEnd));
    ctx.stroke();

    // the two objectives along the search direction
    const curve = (f, colour, dash) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) {
        const e = (i / 300) * etaMax;
        if (i) ctx.lineTo(X(e), Y(f(e)));
        else ctx.moveTo(X(e), Y(f(e)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(fullObjective, k.accent, []);
    curve(sampledObjective, k.diverge, [7, 5]);

    // trials
    let moving = null;
    TRIALS.forEach((trial, i) => {
      const ev = TL.events[i];
      if (time < ev.slideStart) return;
      const from = i === 0 ? trial.eta : TRIALS[i - 1].eta;
      if (time < ev.evalAt) {
        const u = Math.min(1, (time - ev.slideStart) / (ev.slideEnd - ev.slideStart));
        moving = from + (trial.eta - from) * easeInOut(u);
        return;
      }
      const colour = trial.accepted ? k.ok : k.bad;
      const px = X(trial.eta);
      const py = Y(sampledObjective(trial.eta));
      // tick on the η axis, and the word under it
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, axisY - 5);
      ctx.lineTo(px, axisY + 4);
      ctx.stroke();
      ctx.fillStyle = colour;
      ctx.font = `12px ${k.math}`;
      ctx.textAlign = 'center';
      ctx.fillText(trial.accepted ? 'accepted' : 'rejected', px, axisY + 18);
      ctx.textAlign = 'left';
      if (trial.accepted) {
        const age = time - ev.evalAt;
        const pop = age < TL.popMs ? 1 + 0.45 * Math.sin((Math.PI * age) / TL.popMs) : 1;
        ctx.fillStyle = k.ok;
        ctx.beginPath();
        ctx.arc(px, py, 6 * pop, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = k.bad;
        ctx.fillStyle = k.surface;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    if (moving !== null) {
      ctx.strokeStyle = k.ink;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = k.surface;
      ctx.beginPath();
      ctx.arc(X(moving), Y(sampledObjective(moving)), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // update: starting level, the drop to x_{t+1}, and x_{t+1} on the full objective
    if (time >= TL.updateAt) {
      ctx.globalAlpha = Math.min(1, (time - TL.updateAt) / TL.updateFade);
      const ux = X(ACCEPTED);
      const uy = Y(fullObjective(ACCEPTED));
      ctx.strokeStyle = k.ink3;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0) + 0.5);
      ctx.lineTo(w - PAD.right, Y(0) + 0.5);
      ctx.moveTo(ux, Y(0));
      ctx.lineTo(ux, uy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = k.accent;
      ctx.beginPath();
      ctx.arc(ux, uy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = k.ink;
      // label to the right of the dot, or to its left when the accepted step is near the right edge
      const lx = ux + 44 > w - PAD.right ? ux - 36 : ux + 8;
      ctx.font = `italic 14px ${k.math}`;
      ctx.fillText('x', lx, uy + 14);
      ctx.font = `10px ${k.math}`;
      ctx.fillText('t+1', lx + 7, uy + 18);
      ctx.globalAlpha = 1;
    }
  }

  function play() {
    cancelAnimationFrame(raf);
    if (reducedMotion()) {
      time = TL.end;
      draw();
      return;
    }
    const start = performance.now();
    const tick = now => {
      time = Math.max(0, Math.min(TL.end, now - start));
      draw();
      if (time < TL.end) raf = requestAnimationFrame(tick);
    };
    time = 0;
    draw();
    raf = requestAnimationFrame(tick);
  }

  // Click, Enter or Space: draw a new Armijo line (new c) and replay.
  const replayWithNewLine = () => {
    setArmijoC(pickArmijoC(c));
    play();
  };
  canvas.addEventListener('click', replayWithNewLine);
  onActivateKey(canvas, replayWithNewLine);

  figure.hidden = false;
  draw();
  onRedrawNeeded(canvas, draw);
  onFirstView(canvas, play);
}
