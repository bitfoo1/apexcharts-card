import { describe, expect, it } from 'vitest';
import { bucketHistory } from '../src/graphEntry';
import { moment } from '../src/const';
import { EntityCachePoints } from '../src/types';

/**
 * Bucketing turns raw points into the intervals the group_by aggregations reduce.
 * Getting a boundary or a fill rule wrong shifts or invents values without any
 * error, so these tests pin the observable contract.
 *
 * They also settle a question the backlog raised for upstream issue #1055 —
 * whether bucket timestamps sit at the end of their interval. They do not: a
 * bucket carries the START of its interval.
 */
const MINUTE = 60000;
const T0 = 1_700_000_000_000; // fixed epoch, so nothing depends on the clock

/** Builds the range the card passes in: from T0 to T0 + spanMinutes. */
function range(spanMinutes: number) {
  return moment.range(moment(T0), moment(T0 + spanMinutes * MINUTE));
}

/** A point at T0 + offsetMinutes. */
function at(offsetMinutes: number, value: number | null): [number, number | null] {
  return [T0 + offsetMinutes * MINUTE, value];
}

/** Bucket boundaries as minutes after T0, for readable assertions. */
function boundaries(buckets: { timestamp: number }[]): number[] {
  return buckets.map((b) => (b.timestamp - T0) / MINUTE);
}

function values(buckets: { data: EntityCachePoints }[]): (number | null)[][] {
  return buckets.map((b) => b.data.map((p) => p[1]));
}

describe('bucketHistory boundaries', () => {
  /*
   * The first and last bucket are dropped by design: stepping backwards from the
   * range end leaves a partial bucket at the start, and the final boundary is the
   * range end itself, which owns no interval.
   */
  it('drops the leading and trailing boundary bucket', () => {
    const buckets = bucketHistory(
      [at(1, 1), at(6, 2), at(11, 3), at(16, 4), at(21, 5)],
      range(25),
      { durationMs: 5 * MINUTE, fill: 'null' },
    );
    expect(boundaries(buckets)).toEqual([5, 10, 15, 20]);
  });

  it('labels a bucket with the start of its interval, not the end', () => {
    const buckets = bucketHistory([at(7, 42)], range(15), { durationMs: 5 * MINUTE, fill: 'null' });
    const withData = buckets.find((b) => b.data.some((p) => p[1] === 42));
    expect(boundaries([withData!])).toEqual([5]);
  });

  it('puts a point exactly on a boundary into the bucket that starts there', () => {
    const buckets = bucketHistory([at(10, 7)], range(20), { durationMs: 5 * MINUTE, fill: 'null' });
    const withData = buckets.find((b) => b.data.some((p) => p[1] === 7));
    expect(boundaries([withData!])).toEqual([10]);
  });

  it('collects every point of an interval in one bucket', () => {
    const buckets = bucketHistory([at(5, 1), at(6, 2), at(9, 3)], range(15), {
      durationMs: 5 * MINUTE,
      fill: 'null',
    });
    expect(values(buckets)).toEqual([[1, 2, 3]]);
  });
});

describe('bucketHistory fill modes', () => {
  const gapped = [at(1, 10), at(16, 20)]; // nothing between minute 5 and 15

  it("fill: null marks an empty bucket as a gap", () => {
    const buckets = bucketHistory(gapped, range(20), { durationMs: 5 * MINUTE, fill: 'null', now: T0 + 20 * MINUTE });
    expect(values(buckets)).toEqual([[null], [null], [20]]);
  });

  it('fill: zero puts a zero in an empty bucket', () => {
    const buckets = bucketHistory(gapped, range(20), { durationMs: 5 * MINUTE, fill: 'zero', now: T0 + 20 * MINUTE });
    expect(values(buckets)).toEqual([[0], [0], [20]]);
  });

  it('fill: last carries the previous bucket value forward', () => {
    const buckets = bucketHistory([at(6, 10), at(21, 20)], range(25), {
      durationMs: 5 * MINUTE,
      fill: 'last',
      now: T0 + 25 * MINUTE,
    });
    expect(values(buckets)).toEqual([[10], [10], [10], [20]]);
  });

  /*
   * A bucket in the future is left empty by last/zero, so a chart whose span
   * reaches past now does not draw a synthetic flat line ahead of the data.
   * fill: null has no such guard, because a gap is the honest representation.
   *
   * Making that visible needs data after `now`, otherwise the trailing-gap
   * trimming below removes the future buckets and hides the difference.
   */
  it('leaves future buckets empty for last and zero, but marks them for null', () => {
    const data = [at(1, 10), at(21, 20)];
    const args = { durationMs: 5 * MINUTE, now: T0 + 10 * MINUTE } as const;
    // Buckets 5 and 10 are in the past and get filled; 15 is in the future.
    expect(values(bucketHistory(data, range(25), { ...args, fill: 'zero' }))).toEqual([[0], [0], [], [20]]);
    expect(values(bucketHistory(data, range(25), { ...args, fill: 'null' }))).toEqual([
      [null],
      [null],
      [null],
      [20],
    ]);
  });

  /*
   * data_generator produces the whole series up front, including points ahead of
   * now (the Solcast forecast card), so the future guard must not apply there.
   */
  it('fills future buckets when the series comes from a data_generator', () => {
    const buckets = bucketHistory([at(1, 10)], range(20), {
      durationMs: 5 * MINUTE,
      fill: 'last',
      now: T0 + 5 * MINUTE,
      hasDataGenerator: true,
    });
    expect(values(buckets)).toEqual([[10], [10], [10]]);
  });
});

describe('bucketHistory trailing gaps', () => {
  /*
   * Trailing empty or null-only buckets are removed so a line ends at its last
   * real value instead of trailing off into the future.
   */
  it('trims null-only buckets from the end but keeps interior gaps', () => {
    const buckets = bucketHistory([at(1, 10), at(16, 20)], range(35), {
      durationMs: 5 * MINUTE,
      fill: 'null',
      now: T0 + 35 * MINUTE,
    });
    expect(boundaries(buckets)).toEqual([5, 10, 15]);
    expect(values(buckets)).toEqual([[null], [null], [20]]);
  });

  it('returns nothing when no bucket holds data', () => {
    expect(bucketHistory([], range(20), { durationMs: 5 * MINUTE, fill: 'null' })).toEqual([]);
  });
});

describe('bucketHistory start_with_last', () => {
  /*
   * Prepends the previous bucket's last value at the boundary, so a step chart
   * shows the level a bucket started at rather than jumping at its first sample.
   */
  it('prepends the previous bucket value at the boundary', () => {
    const buckets = bucketHistory([at(6, 10), at(12, 20)], range(20), {
      durationMs: 5 * MINUTE,
      fill: 'null',
      startWithLast: true,
      now: T0 + 20 * MINUTE,
    });
    // The 20-bucket carries the 10-bucket's last value ahead of its own sample.
    expect(values(buckets)[1]).toEqual([10, 20]);
  });

  /*
   * Documents a latent defect rather than the intended behaviour: the branch that
   * seeds a first bucket from the last point BEFORE the range keys on index 0 of
   * the pre-trim array — which is the leading partial bucket that the following
   * `shift()` discards. The surviving first bucket therefore falls into the
   * "previous bucket" branch and inherits that bucket's fill value, here null,
   * so the 99 never reaches the chart. Left as-is because start_with_last is a
   * niche option, upstream's only patch for it (PR #360) removes a guard without
   * a reproduction case, and changing it would alter rendered output.
   */
  it('loses the pre-range seed value, because it lands in the bucket that gets dropped', () => {
    const buckets = bucketHistory([at(-3, 99), at(7, 10)], range(15), {
      durationMs: 5 * MINUTE,
      fill: 'null',
      startWithLast: true,
      now: T0 + 15 * MINUTE,
    });
    expect(values(buckets)[0]).toEqual([null, 10]);
  });

  it('does not prepend when a point already sits exactly on the boundary', () => {
    const buckets = bucketHistory([at(5, 10), at(10, 20)], range(15), {
      durationMs: 5 * MINUTE,
      fill: 'null',
      startWithLast: true,
      now: T0 + 15 * MINUTE,
    });
    expect(values(buckets)).toEqual([[10], [20]]);
  });
});
