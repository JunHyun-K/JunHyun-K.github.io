# JunHyun Kim — personal website

A single-column research homepage. The page is static HTML: every word is in `index.html`, so it reads
the same with JavaScript off and in search engines and link previews. JavaScript only adds the
light/dark toggle and the two figures (which stay hidden when JavaScript is off).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Edit content

- **Page text:** edit `index.html` directly. It follows `01_Page_text_v2.md` from the handoff word for word:
  About, Publications, Research, Background, footer.
- **Page title and link preview:** the `<title>`, `description` and `og:` tags at the top of `index.html`.
- **Photo:** `src/assets/portrait_final_336x420.jpg`, shown at 112 × 140.
- **Styles:** `src/styles/global.css` (colours for light and dark, type, layout); fonts in `src/styles/fonts.css`.

Planned updates (from the handoff): the ICLR status after the January decision, and a Talks line for the
OPT 2026 posters after December.

## Figures

Both figures follow `02_Figure_specs.md` from the handoff.

- **Figure 1** (`src/figures/figure1.js`): Algorithm 1 of [2] without noise (a = 2, β_t = 2/(t+2),
  η_t = 1/(t+2)^{3/4}) on min_x max_y xy, against plain descent–ascent; both run for 4^10 steps (the
  orange circle goes about 20 times around). Dots mark iterations: blue at t = 4^k, orange at t = 2^k.
  Click the plot to start from a new point; Enter or Space replays.
- **Figure 2** (`src/figures/figure2.js`): backtracking with the Armijo test along one search direction,
  in seven animated stages. Plays when scrolled into view with the spec's c = 0.5 (also after every
  page load). A click, Enter or Space replays it with a new Armijo line: c is drawn from
  `ARMIJO_C_RANGE` in `math.js` (0.33–0.6) and the real Armijo test decides each trial, so every
  click shows one or two rejections before the accepted step.
- Both start when scrolled into view and draw only the final frame under reduced motion.

`node scripts/check-figures.mjs` recomputes the spec's check numbers from the site's own maths
(`src/figures/math.js`) and prints PASS/FAIL for each.

## Project layout

```
index.html                 all page text, metadata and figure markup
scripts/check-figures.mjs  reproduces the figure spec's check numbers
src/
  main.js                  theme toggle and figure set-up (progressive enhancement)
  figures/                 math.js (no DOM), figure1.js, figure2.js, shared.js
  assets/                  portrait
  styles/
    main.css               linked from index.html; imports the two files below
    global.css             colour variables (incl. --ok/--bad for Figure 2), type, layout, figure classes
    fonts.css              self-hosted Newsreader and STIX Two Text
public/favicon.svg
```

## Deploy to GitHub Pages

1. Create a repo named `JunHyun-K.github.io` and push this project to `main`.
2. In the repo: Settings → Pages → Source → **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push.

Using a different repo name (e.g. `portfolio`)? Set `base: '/portfolio/'` in `vite.config.js`.
