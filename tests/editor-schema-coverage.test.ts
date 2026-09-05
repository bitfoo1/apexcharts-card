import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as checkers from '../src/types-config-ti';
import * as advanced from '../src/editor/schemas/advanced';
import * as apex from '../src/editor/schemas/apex';
import * as display from '../src/editor/schemas/display';
import * as general from '../src/editor/schemas/general';
import * as series from '../src/editor/schemas/series';

/*
 * The editor names config options in string form, which no compiler checks against
 * `types-config.ts`. The schema types cover one direction: a name that is not a key
 * of the interface being edited fails to compile. This test covers the other, the
 * one a type cannot see — an option added to the card and forgotten in the editor.
 *
 * The config surface is read from `src/types-config-ti.ts`, which
 * `npm run build:types-check` regenerates from `types-config.ts`, so this asserts
 * against the same description the card validates against at runtime rather than a
 * second copy of it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const suite = checkers as unknown as Record<string, any>;

/** Follows a named reference and strips optional/array/union wrappers. */
function resolve(ttype: any, seen = new Set<any>()): any[] {
  if (!ttype || typeof ttype !== 'object' || seen.has(ttype)) return [];
  seen.add(ttype);
  const kind = ttype.constructor?.name;
  if (kind === 'TName') return suite[ttype.name] ? resolve(suite[ttype.name], seen) : [];
  if (kind === 'TOptional' || kind === 'TArray') return resolve(ttype.ttype, seen);
  if (kind === 'TUnion' || kind === 'TIntersection') return (ttype.ttypes ?? []).flatMap((t: any) => resolve(t, seen));
  if (kind === 'TIface') return [ttype];
  return [];
}

/** Every field name reachable from the card's config type, at any depth. */
function configFieldNames(): Set<string> {
  const names = new Set<string>();
  const visited = new Set<any>();
  const walk = (iface: any) => {
    if (!iface || visited.has(iface)) return;
    visited.add(iface);
    for (const prop of iface.props ?? []) {
      names.add(prop.name);
      for (const nested of resolve(prop.ttype)) walk(nested);
    }
  };
  for (const iface of resolve(suite.ChartCardExternalConfig)) walk(iface);
  return names;
}

/** Field names the schema modules use, read from the data itself. */
function schemaNames(): Set<string> {
  const names = new Set<string>();
  const collect = (entries: any[]) => {
    for (const entry of entries) {
      if (entry?.name) names.add(entry.name);
      if (Array.isArray(entry?.schema)) collect(entry.schema);
    }
  };
  for (const mod of [advanced, apex, display, general, series]) {
    for (const value of Object.values(mod as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      if (value.every((v) => typeof v === 'string')) {
        value.forEach((v) => names.add(v as string));
      } else {
        collect(value as any[]);
      }
    }
  }
  return names;
}

/**
 * Names used in schemas built inside components rather than declared as data.
 *
 * Read out of the source text, because those live in Lit elements that would have
 * to be instantiated to be inspected. Crude on purpose: this only has to widen the
 * set of names the editor is known to write, and a false positive here can only
 * mask a missing field, never invent one.
 */
function inlineComponentNames(): Set<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const names = new Set<string>();
  for (const dir of ['components', 'tabs']) {
    const base = join(here, '..', 'src', 'editor', dir);
    for (const file of readdirSync(base).filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(join(base, file), 'utf8');
      for (const match of source.matchAll(/name:\s*'([a-z_][a-z0-9_]*)'/gi)) names.add(match[1]);
    }
  }
  return names;
}

/**
 * Options with no form field, and why. Every entry is a decision: the list exists
 * so that a genuinely forgotten option cannot hide among the deliberate omissions.
 * `show.version` was found missing exactly this way and given a field instead.
 */
const NO_FORM_FIELD: Record<string, string> = {
  // Fixed or structural.
  type: 'always custom:apexcharts-card; Home Assistant writes it when the card is added',
  index: 'internal position bookkeeping, not user configuration',
  view_index: 'internal position bookkeeping, not user configuration',

  // Containers whose contents are offered individually.
  header: 'container; its title and flags are offered by the Display tab',
  now: 'container; colour and label via NOW_SCHEMA, show via a bool grid',
  group_by: 'container; duration, func, fill and start_with_last via SERIES_GROUP_BY_SCHEMA',
  experimental: 'container; its four flags via EXPERIMENTAL_BOOL_FIELDS',

  // Edited by a dedicated component instead of a generated form field.
  chart_type: 'chosen from the icon row built by chart-type-picker',
  series: 'a list, edited entry by entry by series-editor',
  yaxis: 'a list, edited entry by entry by yaxis-editor',
  color_list: 'a list of colours, edited by color-list-editor',
  opposite: 'part of a y-axis entry, edited by yaxis-item-editor',
  value: 'part of a colour threshold entry, edited by color-threshold-editor',
  header_actions: 'edited by actions-editor',
  title_actions: 'edited by actions-editor',
  tap_action: 'edited by actions-editor',
  hold_action: 'edited by actions-editor',
  double_tap_action: 'edited by actions-editor',
  service_data: 'free-form service payload, edited as YAML inside the action editor',

  // Deliberately YAML-only.
  apex_config: "ApexCharts' own API, which the card does not type, so it stays YAML",
  all_series_config: 'a hidden default layer under every series; editing series individually is clearer',
  config_templates: 'references templates defined elsewhere in the dashboard, which the editor cannot enumerate',

  // Home Assistant's or a third party's card options, not this card's.
  style: 'card-mod styling, owned by that integration',
  card_mod: 'card-mod configuration, owned by that integration',
  browser_mod: 'browser_mod action payload, owned by that integration',
  view_layout: "Home Assistant's own placement option",
  visibility: "Home Assistant's own conditional visibility, edited on its Visibility tab",
  grid_options: "Home Assistant's own sizing in sections views",
};

describe('editor schema coverage against types-config.ts', () => {
  const configNames = configFieldNames();
  const editorNames = new Set([...schemaNames(), ...inlineComponentNames()]);

  it('reads a plausible config surface from the generated checkers', () => {
    // Guards the walker itself: if resolution broke, everything below would pass
    // trivially on an empty set.
    expect(configNames.size).toBeGreaterThan(80);
    expect(configNames).toContain('graph_span');
    expect(configNames).toContain('start_with_last');
  });

  it('offers a form field for every config option, or names why not', () => {
    const missing = [...configNames].filter((name) => !editorNames.has(name) && !(name in NO_FORM_FIELD)).sort();
    expect(missing).toEqual([]);
  });

  it('keeps the exemption list free of options that do have a field', () => {
    // An option that gained a form field should leave the list, otherwise the list
    // slowly stops describing anything.
    const stale = Object.keys(NO_FORM_FIELD).filter((name) => editorNames.has(name) && name !== 'type');
    expect(stale).toEqual([]);
  });
});
