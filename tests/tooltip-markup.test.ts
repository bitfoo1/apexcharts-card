import { beforeAll, describe, expect, it } from 'vitest';
import ApexCharts from 'apexcharts';
import { stylesApex } from '../src/styles';

/**
 * The chart renders inside the card's shadow root, where ApexCharts' own
 * document-level stylesheet does not apply — src/styles.ts carries a copy. That
 * copy therefore has to match the markup the bundled ApexCharts actually
 * produces, and this suite asserts against the real rendered DOM rather than
 * against an assumption about it.
 *
 * The concrete regression: ApexCharts 6 renders the tooltip marker as an inline
 * <svg> and dropped the ::before glyph shapes of 5.x. With the 5.x rules still
 * in the copy, each marker painted both the glyph and the svg, and the unstyled
 * svg wrapped onto its own line — a second, value-less row per series.
 */
const css = stylesApex.toString();

let tooltip: Element | null = null;

beforeAll(async () => {
  // jsdom has no ResizeObserver; ApexCharts registers one during render.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const el = document.createElement('div');
  document.body.appendChild(el);
  const chart = new ApexCharts(el, {
    chart: { type: 'line', width: 600, height: 300, animations: { enabled: false } },
    tooltip: { shared: true, intersect: false },
    series: [
      { name: 'A', data: [[1, 1] as [number, number], [2, 2] as [number, number]] },
      { name: 'B', data: [[1, 3] as [number, number], [2, 4] as [number, number]] },
      { name: 'C', data: [[1, 5] as [number, number], [2, 6] as [number, number]] },
    ],
    xaxis: { type: 'datetime' },
  });
  await chart.render();
  tooltip = el.querySelector('.apexcharts-tooltip');
});

describe('tooltip markup produced by the bundled ApexCharts', () => {
  it('renders exactly one series group and one marker per series', () => {
    expect(tooltip).not.toBeNull();
    expect(tooltip!.querySelectorAll('.apexcharts-tooltip-series-group')).toHaveLength(3);
    expect(tooltip!.querySelectorAll('.apexcharts-tooltip-marker')).toHaveLength(3);
  });

  it('draws each marker as a single inline svg', () => {
    const markers = [...tooltip!.querySelectorAll('.apexcharts-tooltip-marker')];
    for (const marker of markers) {
      expect(marker.querySelectorAll('svg')).toHaveLength(1);
    }
  });
});

describe('the shadow-root stylesheet matches that markup', () => {
  it('sizes the marker svg, so it cannot wrap onto a line of its own', () => {
    expect(css).toMatch(/\.apexcharts-tooltip-marker svg\s*\{[^}]*width:\s*100%/);
    expect(css).toMatch(/\.apexcharts-tooltip-marker svg\s*\{[^}]*display:\s*block/);
  });

  it('no longer paints the ApexCharts 5 glyph shapes next to the svg', () => {
    expect(css).not.toContain('.apexcharts-tooltip-marker::before');
    for (const shape of ['circle', 'square', 'diamond', 'triangle', 'star']) {
      expect(css, `${shape} glyph rule still present`).not.toContain(
        `.apexcharts-tooltip-marker[shape='${shape}']`,
      );
    }
  });
});
