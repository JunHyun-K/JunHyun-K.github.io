// Helpers shared by both figures: canvas sizing, theme colours, motion and visibility.

export function readTokens(el) {
  const cs = getComputedStyle(el);
  const v = name => cs.getPropertyValue(name).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    rule: v('--rule'),
    surface: v('--surface'),
    accent: v('--accent'),
    diverge: v('--diverge'),
    ok: v('--ok'),
    bad: v('--bad'),
    math: v('--font-math')
  };
}

/** Sizes the canvas backing store to its 4:3 CSS box and returns a context in CSS pixels. */
export function fitCanvas(canvas) {
  const w = canvas.clientWidth;
  const h = Math.round((w * 3) / 4);
  const dpr = window.devicePixelRatio || 1;
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Calls cb once, the first time el is mostly in view. */
export function onFirstView(el, cb) {
  if (typeof IntersectionObserver === 'undefined') {
    cb();
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { threshold: 0.4 }
  );
  io.observe(el);
}

/** Calls cb when el changes width, when the theme changes, and once the fonts are ready. */
export function onRedrawNeeded(el, cb) {
  let lastWidth = el.clientWidth;
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        cb('resize');
      }
    }).observe(el);
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => cb('theme'));
  new MutationObserver(() => cb('theme')).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  if (document.fonts?.ready) document.fonts.ready.then(() => cb('fonts'));
}

/** Enter or Space on a focused canvas does what a click does. */
export function onActivateKey(el, cb) {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      cb();
    }
  });
}
