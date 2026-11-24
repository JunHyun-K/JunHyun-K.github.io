// Progressive enhancement only: the page text is complete without this script.
// It shows the theme toggle and adds the two figures and their interaction.
import { initFigure1 } from './figures/figure1.js';
import { initFigure2 } from './figures/figure2.js';

// ---- theme toggle ----
const root = document.documentElement;
const button = document.getElementById('theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

const currentTheme = () => root.getAttribute('data-theme') || (prefersDark.matches ? 'dark' : 'light');

const updateLabel = () => {
  button.textContent = currentTheme() === 'dark' ? 'Light theme' : 'Dark theme';
};

if (button) {
  button.hidden = false;
  updateLabel();
  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable: the theme still applies for this visit */
    }
    updateLabel();
  });
  prefersDark.addEventListener('change', updateLabel);
}

// ---- figures ----
const fig1 = document.getElementById('figure-1');
const fig2 = document.getElementById('figure-2');
if (fig1) initFigure1(fig1);
if (fig2) initFigure2(fig2);
