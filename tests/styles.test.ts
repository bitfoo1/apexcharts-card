import { describe, expect, it } from 'vitest';
import { stylesApex } from '../src/styles';

/**
 * src/styles.ts carries a copy of ApexCharts' stylesheet, because the chart
 * renders in this card's shadow root where the library's document-level CSS
 * never reaches. The copy is kept verbatim from the bundled version and then
 * re-themed by redefining ApexCharts 6's design tokens.
 *
 * Two things must hold for that to work, and both are easy to break by
 * re-syncing the copy from a new ApexCharts release:
 *   1. the Home Assistant override has to define the tokens, and
 *   2. it has to come AFTER the library's own light/dark blocks, because the
 *      specificity is equal and source order decides.
 *
 * The regression this guards: ApexCharts 6 sets 'color: var(--apx-tt-color)'
 * with a near-black light default, where 5.x set no color at all and inherited
 * --primary-text-color. Without the override, a dark HA theme rendered black
 * text on a dark tooltip.
 */
const css = stylesApex.toString();

const HA_TOOLTIP_OVERRIDE = '--apx-tt-color: var(--primary-text-color)';
const HA_AXIS_OVERRIDE = '--apx-axt-color: var(--primary-text-color)';

describe('tooltip theming', () => {
  it('redefines the tooltip tokens from Home Assistant variables', () => {
    expect(css).toContain('--apx-tt-bg: var(--card-background-color)');
    expect(css).toContain(HA_TOOLTIP_OVERRIDE);
    expect(css).toContain('--apx-tt-color-muted: var(--secondary-text-color');
    expect(css).toContain('--apx-tt-border: var(--divider-color');
  });

  it('applies the override to the base rule and to both theme classes', () => {
    const start = css.indexOf(HA_TOOLTIP_OVERRIDE);
    const selector = css.lastIndexOf('{', start);
    const block = css.slice(css.lastIndexOf('}', selector) + 1, selector);
    expect(block).toContain('.apexcharts-tooltip');
    expect(block).toContain('.apexcharts-tooltip.apexcharts-theme-light');
    expect(block).toContain('.apexcharts-tooltip.apexcharts-theme-dark');
  });

  it('places the override after the library rules it has to win against', () => {
    // Equal specificity, so source order decides.
    const libraryDark = css.lastIndexOf('--apx-tt-color: #f3f4f6');
    const override = css.indexOf(HA_TOOLTIP_OVERRIDE);
    expect(libraryDark, 'library dark block not found — copy out of sync?').toBeGreaterThan(-1);
    expect(override).toBeGreaterThan(libraryDark);
  });

  it('sets a plain color too, as a fallback for versions without the tokens', () => {
    const start = css.indexOf(HA_TOOLTIP_OVERRIDE);
    const block = css.slice(start, css.indexOf('}', start));
    expect(block).toContain('color: var(--primary-text-color)');
  });
});

describe('axis tooltip theming', () => {
  it('redefines the axis tooltip tokens from Home Assistant variables', () => {
    expect(css).toContain('--apx-axt-bg: var(--card-background-color)');
    expect(css).toContain(HA_AXIS_OVERRIDE);
  });

  it('places that override after the library dark block as well', () => {
    const libraryDark = css.lastIndexOf('--apx-axt-color: #f3f4f6');
    expect(libraryDark).toBeGreaterThan(-1);
    expect(css.indexOf(HA_AXIS_OVERRIDE)).toBeGreaterThan(libraryDark);
  });
});
