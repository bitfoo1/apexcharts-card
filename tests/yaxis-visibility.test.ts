import { beforeAll, describe, expect, it } from 'vitest';
import ApexCharts from 'apexcharts';
import { keepSharedYAxisVisible } from '../src/apex-layouts';

/**
 * Upstream issue #1031: hiding a series through the legend can make the y-axis
 * disappear entirely.
 *
 * The mechanism, read out of the bundled library: the card emits one apex yaxis
 * entry per series (a parallel array) and marks only the first entry of each
 * card axis `show: true`, the rest `show: false`. ApexCharts maps entry N to
 * series N and, in excludeCollapsedSeriesInYAxis, adds an axis index to
 * globals.ignoreYAxisIndexes once *all* series mapped to it are collapsed. With
 * the 1:1 mapping that test degenerates to "this single series is collapsed",
 * so collapsing the first series drops the only entry that had show: true and
 * no axis is drawn at all.
 *
 * These tests pin the library behaviour the fix relies on, so an ApexCharts
 * upgrade that changes it fails here rather than silently in a dashboard.
 */
type Point = [number, number];

const SERIES = [
  { name: 'A', data: [[1, 10] as Point, [2, 20] as Point] },
  { name: 'B', data: [[1, 30] as Point, [2, 40] as Point] },
  { name: 'C', data: [[1, 50] as Point, [2, 60] as Point] },
];

function axisEntries(showAlways: boolean) {
  // Mirrors what _generateYAxisConfig emits for one card yaxis and three series.
  return SERIES.map((_, index) => ({
    show: index === 0,
    ...(index === 0 && showAlways ? { showAlways: true } : {}),
    decimalsInFloat: 1,
  }));
}

/**
 * jsdom lowercases attribute names in selectors even for foreign elements, so
 * ApexCharts' own `.apexcharts-series[seriesName='…']` lookup — the entry point
 * of hideSeries — never matches the SVG group that carries the camel-cased
 * attribute. Real browsers match it case-sensitively as authored and find it.
 * Mirroring the value under a lowercase name makes the library's lookup work
 * here; it is an environment shim in the spirit of the ResizeObserver stub
 * below, and touches nothing the card ships.
 */
function bridgeCamelCaseAttributeLookup(root: Element): void {
  root.querySelectorAll('.apexcharts-series').forEach((group) => {
    const name = group.getAttribute('seriesName');
    if (name !== null) group.setAttribute('seriesname', name);
  });
}

async function renderAndHideFirstSeries(showAlways: boolean): Promise<number> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const chart = new ApexCharts(el, {
    chart: { type: 'line', width: 600, height: 300, animations: { enabled: false } },
    series: SERIES,
    xaxis: { type: 'datetime' },
    yaxis: axisEntries(showAlways),
  } as ApexCharts.ApexOptions);
  await chart.render();
  bridgeCamelCaseAttributeLookup(el);
  expect(el.querySelectorAll('.apexcharts-yaxis-label').length).toBeGreaterThan(0);
  await chart.hideSeries('A');
  // A drawn axis carries labels; ApexCharts keeps an empty group for a hidden one.
  return el.querySelectorAll('.apexcharts-yaxis-label').length;
}

beforeAll(() => {
  // jsdom has no ResizeObserver; ApexCharts registers one during render.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('ApexCharts y-axis visibility when a series is collapsed', () => {
  it('drops the axis when the only entry with show: true belongs to the hidden series', async () => {
    expect(await renderAndHideFirstSeries(false)).toBe(0);
  });

  it('keeps the axis when that entry is marked showAlways', async () => {
    expect(await renderAndHideFirstSeries(true)).toBeGreaterThan(0);
  });
});

type AxisEntry = { show?: boolean; showAlways?: boolean };

describe('keepSharedYAxisVisible', () => {
  it('marks the visible entry of an axis that several series share', () => {
    const entries: AxisEntry[] = [{ show: true }, { show: false }, { show: false }];
    keepSharedYAxisVisible(entries, [0, 0, 0]);
    expect(entries[0].showAlways).toBe(true);
  });

  it('leaves a single-series axis alone, where hiding the series should hide the axis', () => {
    const entries: AxisEntry[] = [{ show: true }];
    keepSharedYAxisVisible(entries, [0]);
    expect(entries[0].showAlways).toBeUndefined();
  });

  it('marks the visible entry of every shared axis independently', () => {
    const entries: AxisEntry[] = [{ show: true }, { show: false }, { show: true }];
    keepSharedYAxisVisible(entries, [0, 0, 1]);
    expect(entries[0].showAlways).toBe(true);
    expect(entries[2].showAlways).toBeUndefined();
  });

  it('respects an explicit showAlways from the user apex_config', () => {
    const entries: AxisEntry[] = [{ show: true, showAlways: false }, { show: false }];
    keepSharedYAxisVisible(entries, [0, 0]);
    expect(entries[0].showAlways).toBe(false);
  });
});

/**
 * The helper is unit-tested above; this pins that the card actually calls it, so
 * the fix cannot be silently disconnected from _generateYAxisConfig. Reaching
 * for the private method keeps the test independent of a Home Assistant object,
 * which that method does not need.
 */
describe('_generateYAxisConfig wiring', () => {
  type Card = { _generateYAxisConfig: (c: unknown) => ApexCharts.ApexYAxis[] };

  async function generate(seriesCount: number): Promise<ApexCharts.ApexYAxis[]> {
    await import('../src/apexcharts-card');
    const card = document.createElement('apexcharts-card') as unknown as Card;
    return card._generateYAxisConfig({
      yaxis: [{ min: 0, max: 100 }],
      series_in_graph: Array.from({ length: seriesCount }, (_, i) => ({ entity: `sensor.s${i}` })),
    });
  }

  it('marks the visible entry when the single axis carries several series', async () => {
    const entries = await generate(3);
    expect(entries.map((e) => [e.show, e.showAlways])).toEqual([
      [true, true],
      [false, undefined],
      [false, undefined],
    ]);
  });

  it('leaves a single-series card untouched', async () => {
    const entries = await generate(1);
    expect(entries[0].showAlways).toBeUndefined();
  });
});
