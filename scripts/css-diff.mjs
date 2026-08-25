#!/usr/bin/env node
/*
 * The chart renders in the card's shadow root, where ApexCharts' own
 * document-level stylesheet never applies — src/styles.ts therefore carries a
 * copy of it. That copy silently rots when the bundled ApexCharts version
 * changes: the ApexCharts 6 upgrade left it painting the 5.x tooltip marker
 * glyphs next to the new inline <svg>, which rendered a second, value-less row
 * per series.
 *
 * This script reports the drift so re-syncing is a deliberate step rather than
 * a discovery made in a browser. It is a report, not a gate: many differences
 * are intentional (Home Assistant theming, deliberately omitted features), so
 * it exits 0 and leaves the judgement to a human.
 *
 * Usage: node scripts/css-diff.mjs [selector-substring]
 */
import { readFileSync } from 'node:fs';

const LIBRARY = 'node_modules/apexcharts/dist/apexcharts.css';
const COPY = 'src/styles.ts';
const filter = process.argv[2] ?? '';

function rules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const match of stripped.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const declarations = match[2].split(';').map((d) => d.trim().replace(/\s+/g, ' ')).filter(Boolean).sort().join('; ');
    for (const selector of match[1].split(',')) {
      // Normalise attribute-selector quotes and combinator spacing: prettier
      // rewrites the library's double quotes to single ones and pads `>` inside
      // the lit css`` template.
      const key = selector.trim().replace(/\s+/g, ' ').replace(/"/g, "'").replace(/\s*>\s*/g, '>');
      if (!key) continue;
      if (!out.has(key)) out.set(key, new Set());
      out.get(key).add(declarations);
    }
  }
  return out;
}

const library = rules(readFileSync(LIBRARY, 'utf8'));
const copy = rules(readFileSync(COPY, 'utf8'));
const keep = (selector) => selector.includes(filter);

const missing = [...library.keys()].filter((s) => !copy.has(s) && keep(s));
const extra = [...copy.keys()].filter((s) => !library.has(s) && keep(s));
const changed = [...library.keys()].filter(
  (s) => copy.has(s) && keep(s) && [...library.get(s)].join(' | ') !== [...copy.get(s)].join(' | '),
);

console.log(`library: ${LIBRARY} (${library.size} selectors)`);
console.log(`copy:    ${COPY} (${copy.size} selectors)`);
if (filter) console.log(`filter:  selectors containing "${filter}"`);

console.log(`\n== in the library, missing from the copy (${missing.length}) ==`);
for (const s of missing) console.log(`  ${s}\n      ${[...library.get(s)].join(' | ').slice(0, 160)}`);

console.log(`\n== same selector, different declarations (${changed.length}) ==`);
for (const s of changed) {
  console.log(`  ${s}`);
  console.log(`      library: ${[...library.get(s)].join(' | ').slice(0, 160)}`);
  console.log(`      copy:    ${[...copy.get(s)].join(' | ').slice(0, 160)}`);
}

console.log(`\n== only in the copy (${extra.length}) — card-specific or stale ==`);
for (const s of extra) console.log(`  ${s}`);
