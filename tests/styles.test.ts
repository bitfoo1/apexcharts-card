import { describe, expect, it } from 'vitest';
import { stylesApex } from '../src/styles';

/**
 * ApexCharts 6 paints the tooltip from design tokens and sets an explicit
 * `color: var(--apx-tt-color)` whose light default is near-black, where 5.x
 * declared no color and let the text inherit Home Assistant's
 * --primary-text-color. Overriding only the background (as the card did) then
 * produced black text on a dark card under any dark HA theme.
 *
 * These tests pin that the tooltip takes both its background AND its
 * foreground from the Home Assistant theme, so the regression cannot come back
 * through a future refactor of styles.ts.
 */
const css = stylesApex.toString();

function rule(selector: string): string {
  // Naive but sufficient: the stylesheet is a flat list of `sel { ... }` rules.
  const start = css.indexOf(`${selector} {`);
  expect(start, `selector ${selector} not found`).toBeGreaterThan(-1);
  const end = css.indexOf('}', start);
  return css.slice(start, end);
}

describe('tooltip theming', () => {
  const tooltip = rule('.apexcharts-tooltip');

  it('maps the ApexCharts 6 tooltip tokens onto Home Assistant variables', () => {
    expect(tooltip).toContain('--apx-tt-bg: var(--card-background-color)');
    expect(tooltip).toContain('--apx-tt-color: var(--primary-text-color)');
  });

  it('also sets a plain color, as a fallback for versions without the tokens', () => {
    expect(tooltip).toMatch(/(?<!-)color: var\(--primary-text-color\)/);
  });

  it('never hardcodes a foreground colour on either theme class', () => {
    for (const selector of [
      '.apexcharts-tooltip.apexcharts-theme-light',
      '.apexcharts-tooltip.apexcharts-theme-dark',
    ]) {
      const body = rule(selector);
      expect(body, `${selector} hardcodes a hex colour`).not.toMatch(/color:\s*#[0-9a-f]{3,8}/i);
      expect(body, `${selector} hardcodes an rgb/rgba colour`).not.toMatch(/(?<!-)color:\s*rgba?\(/i);
    }
  });

  it('keeps the axis tooltips readable too', () => {
    const axis = rule('.apexcharts-xaxistooltip,\n  .apexcharts-yaxistooltip');
    expect(axis).toContain('color: var(--primary-text-color)');
    expect(tooltip).toContain('--apx-axt-color: var(--primary-text-color)');
  });
});
