#!/usr/bin/env node
/*
 * Renders the tooltip in a real browser and measures it.
 *
 * jsdom does no layout, so row heights cannot be checked in the unit tests, and
 * arguing about padding arithmetic got the metrics wrong twice during the
 * ApexCharts 6 upgrade. This puts the card's own stylesheet (extracted from
 * src/styles.ts) around the exact markup ApexCharts 6 emits, inside a shadow
 * root as in the real card, and reports measured pixels — plus a screenshot to
 * look at.
 *
 * Usage:
 *   node scripts/tooltip-preview.mjs                     # current stylesheet
 *   node scripts/tooltip-preview.mjs v2.3.3 v2.3.4       # compare git refs
 *   FIREFOX_BIN=/path/to/firefox node scripts/tooltip-preview.mjs
 *
 * Any argument is treated as a git ref whose src/styles.ts is rendered next to
 * the working tree's version.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIREFOX = process.env.FIREFOX_BIN ?? '/Applications/Firefox.app/Contents/MacOS/firefox';

/** Pulls the CSS out of the `css` tagged template in a styles.ts source. */
function extractCss(source) {
  const start = source.indexOf('css`') + 4;
  return source.slice(start, source.indexOf('`;', start));
}

const variants = [
  ...process.argv.slice(2).map((ref) => ({
    label: ref,
    css: extractCss(execFileSync('git', ['show', `${ref}:src/styles.ts`], { encoding: 'utf8' })),
  })),
  { label: 'working tree', css: extractCss(readFileSync('src/styles.ts', 'utf8')) },
];

const series = [
  ['PV1 Sued', '#fdd835', '412 W'],
  ['PV2 Sued', '#c0ca33', '388 W'],
  ['PV3 Ost', '#ffb74d', '96 W'],
  ['PV4 West', '#e57373', '96 W'],
  ['Gesamt', '#43a047', '992 W'],
];

// The markup below is what ApexCharts 6 actually builds, captured from the
// jsdom render in tests/tooltip-markup.test.ts, with the values filled in as on
// hover and the active classes ApexCharts sets at that moment.
const rows = series
  .map(
    ([name, color, value], i) => `<div class="apexcharts-tooltip-series-group apexcharts-tooltip-series-group-${i} apexcharts-active" style="order:${i + 1};display:flex">
  <span class="apexcharts-tooltip-marker" style="color:${color}" shape="circle"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" fill="currentColor"></circle></svg></span>
  <div class="apexcharts-tooltip-text" style="font-family:Helvetica,Arial,sans-serif;font-size:12px">
    <div class="apexcharts-tooltip-y-group"><span class="apexcharts-tooltip-text-y-label">${name}: </span><span class="apexcharts-tooltip-text-y-value">${value}</span></div>
    <div class="apexcharts-tooltip-goals-group"><span class="apexcharts-tooltip-text-goals-label"></span><span class="apexcharts-tooltip-text-goals-value"></span></div>
    <div class="apexcharts-tooltip-z-group"><span class="apexcharts-tooltip-text-z-label"></span><span class="apexcharts-tooltip-text-z-value"></span></div>
  </div></div>`,
  )
  .join('\n');

const html = `<!doctype html><meta charset="utf-8">
<style>
  /* A dark Home Assistant theme, so the token mapping is exercised. */
  html, body {
    margin: 0;
    background: #111418;
    font-family: Roboto, sans-serif;
    --card-background-color: #1c1f26;
    --primary-text-color: #e1e5ea;
    --secondary-text-color: #9aa4b0;
    --divider-color: #2c313a;
    --primary-background-color: #111418;
  }
  .stage { padding: 18px; display: flex; gap: 28px; align-items: flex-start; }
  .label { color: #9aa4b0; font-size: 12px; margin-bottom: 8px; }
  pre { color: #8fd18f; font-size: 11px; margin: 8px 0 0; }
</style>
<div class="stage">${variants.map((v, i) => `<div><div class="label">${v.label}</div><div id="h${i}"></div><pre id="p${i}"></pre></div>`).join('')}</div>
<script>
const rows = ${JSON.stringify(rows)};
const variants = ${JSON.stringify(variants)};
const report = [];
variants.forEach((v, i) => {
  const root = document.getElementById('h' + i).attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + v.css + '</style>'
    + '<div class="apexcharts-tooltip apexcharts-theme-light apexcharts-active" style="position:static;opacity:1;width:230px">'
    + '<div class="apexcharts-tooltip-title" style="font-family:Helvetica,Arial,sans-serif;font-size:12px">23. Aug 14:35</div>'
    + rows + '</div>';
  const tt = root.querySelector('.apexcharts-tooltip');
  const groups = [...root.querySelectorAll('.apexcharts-tooltip-series-group')];
  const total = Math.round(tt.getBoundingClientRect().height);
  const row = +groups[0].getBoundingClientRect().height.toFixed(1);
  document.getElementById('p' + i).textContent = 'tooltip ' + total + 'px / row ' + row + 'px';
  report.push(v.label + ': tooltip ' + total + 'px, row ' + row + 'px');
});
document.title = report.join(' | ');
</script>`;

const dir = mkdtempSync(join(tmpdir(), 'apex-tooltip-'));
const page = join(dir, 'index.html');
const shot = join(dir, 'tooltip.png');
writeFileSync(page, html);
execFileSync(
  FIREFOX,
  ['--headless', '--profile', join(dir, 'profile'), '--screenshot', shot, `--window-size=${260 + variants.length * 260},420`, `file://${page}`],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
// The measurements are rendered into the page itself, so the screenshot carries
// them; print the paths for a human (or an agent) to open.
console.log(`page:       ${page}`);
console.log(`screenshot: ${shot}`);
