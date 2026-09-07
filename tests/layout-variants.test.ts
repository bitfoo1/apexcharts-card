import { describe, expect, it } from 'vitest';
import { foldLayoutYAxis, getLayoutYAxisDefaults, lastRenderedValue } from '../src/apex-layouts';

/**
 * `layout: minimal` declares its y-axis as a single object while the card
 * generates one entry per series. Reconciling the two shapes with mergeDeep
 * discarded one of them — an array replaces an object wholesale — so the
 * variant's `show: false` never reached ApexCharts and a minimal card still drew
 * an axis. Measured in the dev instance before the fix: the axis was live
 * (`w.config.yaxis[0].show === true`) and its bottom label sat 6.7px below the
 * card, visible because `ha-card` is `overflow: visible`.
 *
 * The fold happens in _generateYAxisConfig rather than while assembling the
 * ApexCharts options, because _updateData feeds `apex_config.yaxis` back into
 * updateOptions on every refresh: applied later, the first update undid it.
 */
type Axis = ApexCharts.ApexYAxis & { showAlways?: boolean; decimalsInFloat?: number };

describe('getLayoutYAxisDefaults', () => {
  it('provides defaults for minimal and nothing for other layouts', () => {
    expect(getLayoutYAxisDefaults('minimal')).toMatchObject({ show: false });
    expect(getLayoutYAxisDefaults(undefined)).toBeUndefined();
    expect(getLayoutYAxisDefaults('something-else')).toBeUndefined();
  });
});

describe('foldLayoutYAxis', () => {
  const generated: Axis[] = [
    { min: 0, max: 100, decimalsInFloat: 1, show: true },
    { min: 0, max: 100, decimalsInFloat: 1, show: false },
  ];

  it('keeps the array shape, one entry per series', () => {
    const out = foldLayoutYAxis({ show: false }, generated);
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(2);
  });

  it('keeps the min and max the card was configured with', () => {
    const [axis] = foldLayoutYAxis({ show: false }, generated) as Axis[];
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(100);
    expect(axis.decimalsInFloat).toBe(1);
  });

  it('lets the layout override the generated show, on every entry', () => {
    const out = foldLayoutYAxis({ show: false }, generated) as Axis[];
    expect(out.map((a) => a.show)).toEqual([false, false]);
  });

  it('does not mutate the generated entries', () => {
    const input: Axis[] = [{ min: 0, show: true }];
    foldLayoutYAxis({ show: false }, input);
    expect(input[0].show).toBe(true);
  });

  it('applied with the real minimal defaults, hides the axis', () => {
    const defaults = getLayoutYAxisDefaults('minimal');
    const [axis] = foldLayoutYAxis(defaults as Record<string, unknown>, generated) as Axis[];
    expect(axis.show).toBe(false);
    expect(axis.max).toBe(100);
  });
});

describe('lastRenderedValue', () => {
  /*
   * The legend reads the last value of the array ApexCharts renders. Taking its
   * final element showed `N/A` for every series ending in a gap, which under
   * group_by.full_span is every series: its buckets beyond now are empty by design.
   * The header states had the same bug through a different path — see lastNonNull.
   */
  it('skips a trailing gap', () => {
    expect(lastRenderedValue([1, 2, 3, null, null])).toBe(3);
  });

  it('keeps a zero, which is a value and not a gap', () => {
    expect(lastRenderedValue([5, 0])).toBe(0);
  });

  it('returns null when nothing was rendered', () => {
    expect(lastRenderedValue([])).toBeNull();
    expect(lastRenderedValue([null, null])).toBeNull();
  });
});
