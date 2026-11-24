// Reproduces the check numbers in 02_Figure_specs.md from the site's own figure maths.
// Run: node scripts/check-figures.mjs
import {
  runFigure1,
  DEFAULT_Z0,
  T1,
  backtrackingTrials,
  figure2Timeline,
  fullObjective
} from '../src/figures/math.js';

const results = [];
const check = (name, actual, expected, pass) => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${actual}  (expected ${expected})`);

// Figure 1
const r0 = Math.hypot(...DEFAULT_Z0);
const anchored = {};
let anchoredEnd = null;
let z1 = null;
let gdaAtCut = null;
const t0 = performance.now();
const { cut } = runFigure1(
  DEFAULT_Z0,
  (t, x, y) => {
    if (t === 1) z1 = [x, y];
    if (t === 1000 || t === 100000) anchored[t] = Math.hypot(x, y) / r0;
    if (t === T1) anchoredEnd = Math.hypot(x, y) / r0;
  },
  (t, x, y) => {
    gdaAtCut = Math.hypot(x, y) / r0;
  }
);
const ms = performance.now() - t0;
// descent–ascent at t = T (the drawn path stops at the cut, so continue the radius product)
let gdaEnd = 1;
for (let t = 0; t < T1; t++) gdaEnd *= Math.sqrt(1 + 1 / Math.pow(t + 2, 1.5));

check('Fig 1 z1 (both methods)', `(${z1[0].toFixed(4)}, ${z1[1].toFixed(4)})`, '(0.3941, 0.7487)', z1[0].toFixed(4) === '0.3941' && z1[1].toFixed(4) === '0.7487');
check('Fig 1 anchored distance at t = 1,000', anchored[1000].toFixed(3), '0.343', anchored[1000].toFixed(3) === '0.343');
check('Fig 1 anchored distance at t = 100,000', anchored[100000].toFixed(3), '0.112', anchored[100000].toFixed(3) === '0.112');
check('Fig 1 anchored distance at t = 1,048,576', anchoredEnd.toFixed(3), '0.062', anchoredEnd.toFixed(3) === '0.062');
check('Fig 1 descent–ascent distance at t = 1,048,576', gdaEnd.toFixed(2), '2.14', gdaEnd.toFixed(2) === '2.14');
check('Fig 1 descent–ascent two turns at', `t = ${cut}`, 't = 336', cut === 336);
results.push(`INFO  Fig 1 one full run (both methods): ${ms.toFixed(0)} ms in Node (spec: about 20 ms in the mock-up); radius at the cut ${gdaAtCut.toFixed(2)}`);

// Figure 2
const trials = backtrackingTrials();
const expected = [
  [1, -0.76, -1.2, false],
  [0.6, -0.601, -0.72, false],
  [0.36, -0.53, -0.432, true]
];
check('Fig 2 number of trials', trials.length, 3, trials.length === 3);
expected.forEach(([e, v, a, ok], i) => {
  const tr = trials[i];
  const pass = tr && Math.abs(tr.eta - e) < 1e-9 && tr.value.toFixed(3) === v.toFixed(3) && tr.armijo.toFixed(3) === a.toFixed(3) && tr.accepted === ok;
  check(`Fig 2 trial ${e} η0`, tr ? `${tr.value.toFixed(3)} vs Armijo ${tr.armijo.toFixed(3)} → ${tr.accepted ? 'accepted' : 'rejected'}` : 'missing', `${v.toFixed(3)} vs ${a.toFixed(3)} → ${ok ? 'accepted' : 'rejected'}`, pass);
});
const full = fullObjective(trials[trials.length - 1].eta);
check('Fig 2 full objective at the accepted step', full.toFixed(3), '-0.634', full.toFixed(3) === '-0.634');
const tl = figure2Timeline(trials);
const times = tl.events.map(e => `${e.slideStart}–${e.slideEnd}/${e.evalAt}`).join(', ') + `; update ${tl.updateAt}–${tl.updateAt + tl.updateFade}`;
check('Fig 2 timeline (slide/eval ms)', times, '300–550/900, 1050–1700/2050, 2200–2850/3200; update 3450–3850', times === '300–550/900, 1050–1700/2050, 2200–2850/3200; update 3450–3850');

console.log(results.join('\n'));
process.exitCode = results.some(r => r.startsWith('FAIL')) ? 1 : 0;
