import { describe, expect, it } from 'vitest';
import {
  AGGREGATE_FUNCS,
  aggregateAverage,
  aggregateDelta,
  aggregateDiff,
  aggregateFirst,
  aggregateLast,
  aggregateMaximum,
  aggregateMedian,
  aggregateMinimum,
  aggregateSum,
  filterNulls,
} from '../src/graphEntry';
import { EntityCachePoints } from '../src/types';

/**
 * The group_by aggregations decide the number every bucket of every grouped
 * chart shows. A mistake here does not throw — it renders a plausible but wrong
 * value, so these tests exist to pin the intended semantics, in particular the
 * deliberately differing treatment of nulls: HA reports unavailable and unknown
 * states as null, and a real series contains them.
 */
function points(...values: (number | null)[]): EntityCachePoints {
  return values.map((value, index) => [1000 + index * 60000, value]);
}

describe('filterNulls', () => {
  it('keeps zeros, which are values rather than gaps', () => {
    expect(filterNulls(points(0, null, 0))).toEqual([
      [1000, 0],
      [121000, 0],
    ]);
  });
});

describe('aggregateSum', () => {
  it('adds the values', () => {
    expect(aggregateSum(points(1, 2, 3))).toBe(6);
  });

  it('is 0 for an empty bucket, so a gap does not break a stacked total', () => {
    expect(aggregateSum([])).toBe(0);
  });

  /*
   * Documents the carry-forward rule: a null contributes the last seen value, so
   * a counter that drops out mid-bucket keeps its level instead of dipping.
   */
  it('carries the previous value across a null', () => {
    expect(aggregateSum(points(5, null, 1))).toBe(11);
  });

  it('treats a leading null as zero, having nothing to carry forward', () => {
    expect(aggregateSum(points(null, 4))).toBe(4);
  });

  it('carries the same value across consecutive nulls', () => {
    expect(aggregateSum(points(2, null, null))).toBe(6);
  });

  it('sums negative values without special casing', () => {
    expect(aggregateSum(points(-3, 1))).toBe(-2);
  });
});

describe('aggregateAverage', () => {
  it('divides by the number of non-null points, not by the bucket size', () => {
    expect(aggregateAverage(points(2, null, 4))).toBe(3);
  });

  it('is null when the bucket holds no value at all', () => {
    expect(aggregateAverage(points(null, null))).toBeNull();
    expect(aggregateAverage([])).toBeNull();
  });

  it('counts zeros', () => {
    expect(aggregateAverage(points(0, 10))).toBe(5);
  });
});

describe('aggregateMinimum / aggregateMaximum', () => {
  it('ignore nulls', () => {
    expect(aggregateMinimum(points(null, 7, 3))).toBe(3);
    expect(aggregateMaximum(points(null, 7, 3))).toBe(7);
  });

  it('are null without any value', () => {
    expect(aggregateMinimum(points(null))).toBeNull();
    expect(aggregateMaximum([])).toBeNull();
  });

  it('handle negatives, where a bare falsy check would pick zero', () => {
    expect(aggregateMinimum(points(0, -5))).toBe(-5);
    expect(aggregateMaximum(points(-5, -1))).toBe(-1);
  });

  /*
   * A leading zero is the case that separates a `=== null` seed check from a
   * falsy one: with `if (!min)` the accumulated 0 looks unset and the next point
   * replaces it, so the minimum of [0, 5] comes out as 5.
   */
  it('keep a leading zero as the running value', () => {
    expect(aggregateMinimum(points(0, 5))).toBe(0);
    expect(aggregateMaximum(points(0, -5))).toBe(0);
  });
});

describe('aggregateFirst / aggregateLast', () => {
  it('take the edges by position', () => {
    expect(aggregateFirst(points(1, 2, 3))).toBe(1);
    expect(aggregateLast(points(1, 2, 3))).toBe(3);
  });

  /*
   * Position, not value: an edge null is returned as null rather than skipped,
   * which is what draws a visible gap at a bucket boundary.
   */
  it('return a null sitting at the edge', () => {
    expect(aggregateFirst(points(null, 2))).toBeNull();
    expect(aggregateLast(points(2, null))).toBeNull();
  });

  it('are null for an empty bucket', () => {
    expect(aggregateFirst([])).toBeNull();
    expect(aggregateLast([])).toBeNull();
  });
});

describe('aggregateMedian', () => {
  it('takes the middle of an odd count, unaffected by input order', () => {
    expect(aggregateMedian(points(5, 1, 3))).toBe(3);
  });

  it('averages the two middle values of an even count', () => {
    expect(aggregateMedian(points(1, 2, 3, 4))).toBe(2.5);
  });

  it('handles two points', () => {
    expect(aggregateMedian(points(10, 20))).toBe(15);
  });

  it('ignores nulls when determining the middle', () => {
    expect(aggregateMedian(points(1, null, 3, null, 5))).toBe(3);
  });

  it('returns the single value, and null without one', () => {
    expect(aggregateMedian(points(42))).toBe(42);
    expect(aggregateMedian(points(null))).toBeNull();
    expect(aggregateMedian([])).toBeNull();
  });

  /*
   * The sort is numeric on purpose: the default lexicographic sort would place
   * 10 before 9 and silently return the wrong median.
   */
  it('sorts numerically rather than lexicographically', () => {
    expect(aggregateMedian(points(9, 10, 11))).toBe(10);
  });

  it('does not reorder the caller array', () => {
    const input = points(3, 1, 2);
    aggregateMedian(input);
    expect(input.map((p) => p[1])).toEqual([3, 1, 2]);
  });
});

describe('aggregateDelta', () => {
  it('is the spread and therefore never negative', () => {
    expect(aggregateDelta(points(5, 1, 3))).toBe(4);
    expect(aggregateDelta(points(3, 1, 5))).toBe(4);
  });

  it('is 0 for a flat bucket', () => {
    expect(aggregateDelta(points(7, 7))).toBe(0);
  });

  it('is null without any value', () => {
    expect(aggregateDelta(points(null))).toBeNull();
  });
});

describe('aggregateDiff', () => {
  it('is the net change and can be negative', () => {
    expect(aggregateDiff(points(5, 9, 2))).toBe(-3);
  });

  it('measures the non-null edges, so edge gaps do not null the result', () => {
    expect(aggregateDiff(points(null, 4, 10, null))).toBe(6);
  });

  it('is null when nothing is left after dropping nulls', () => {
    expect(aggregateDiff(points(null, null))).toBeNull();
    expect(aggregateDiff([])).toBeNull();
  });

  it('differs from delta when the series falls', () => {
    const falling = points(10, 4);
    expect(aggregateDiff(falling)).toBe(-6);
    expect(aggregateDelta(falling)).toBe(6);
  });
});

describe('AGGREGATE_FUNCS', () => {
  /*
   * The card validates group_by.func against its own enum, so a key missing here
   * would hand `undefined` to the bucketer and break the chart at runtime rather
   * than at config time.
   */
  it('covers every func the config schema allows', () => {
    expect(Object.keys(AGGREGATE_FUNCS).sort()).toEqual(
      ['avg', 'delta', 'diff', 'first', 'last', 'max', 'median', 'min', 'sum'].sort(),
    );
  });

  it('exposes callable functions that need no instance', () => {
    for (const [name, fn] of Object.entries(AGGREGATE_FUNCS)) {
      expect(typeof fn, name).toBe('function');
      expect(() => fn(points(1, null, 2)), name).not.toThrow();
    }
  });
});
