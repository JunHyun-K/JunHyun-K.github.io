import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The page is static HTML (index.html): every word is in the markup, readable without JavaScript.
// Scripts only add the theme toggle (and, later, the two figures).
//
// `npm run build` makes the normal multi-file site in dist/ (what GitHub Pages serves).
// `npm run build:single` inlines everything into one HTML file (used for quick previews).
//
// base: '/' is right for a user site at https://JunHyun-K.github.io.
// If you deploy from a project repo instead (e.g. github.io/portfolio), set base: '/portfolio/'.
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' }
}));
