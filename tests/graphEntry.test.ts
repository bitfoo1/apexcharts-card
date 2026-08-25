import { describe, expect, it } from 'vitest';
import { fillStatisticGaps } from '../src/graphEntry';
import { StatisticValue } from '../src/types';

const HOUR = 3600000;

function bucket(start: number, end: number, mean: number | null = 1): StatisticValue {
  return {
    statistic_id: 'sensor.test',
    start: start.toString(),
    end: end.toString(),
    last_reset: null,
    max: mean,
    mean: mean,
    min: mean,
    sum: mean,
    state: mean,
    change: mean,
  } as StatisticValue;
}

/**
 * Guards the fix adopted from upstream PR RomRider#1064: a period Home
 * Assistant never reported must show up as a null bucket instead of being
 * bridged by a straight line.
 */
describe('fillStatisticGaps', () => {
  it('leaves a gapless series untouched', () => {
    const input = [bucket(0, HOUR), bucket(HOUR, 2 * HOUR), bucket(2 * HOUR, 3 * HOUR)];
    expect(fillStatisticGaps(input)).toEqual(input);
  });

  it('inserts one null bucket for a single missing period', () => {
    const result = fillStatisticGaps([bucket(0, HOUR), bucket(2 * HOUR, 3 * HOUR)]);

    expect(result).toHaveLength(3);
    expect(result[1].start).toBe(HOUR.toString());
    expect(result[1].end).toBe((2 * HOUR).toString());
    expect(result[1].mean).toBeNull();
    expect(result[1].statistic_id).toBe('sensor.test');
  });

  it('fills a multi-period outage with one null bucket per period', () => {
    const result = fillStatisticGaps([bucket(0, HOUR), bucket(5 * HOUR, 6 * HOUR)]);

    expect(result).toHaveLength(6);
    expect(result.slice(1, 5).every((item) => item.mean === null)).toBe(true);
    expect(result.map((item) => Number(item.start))).toEqual([0, HOUR, 2 * HOUR, 3 * HOUR, 4 * HOUR, 5 * HOUR]);
  });

  it('keeps the reinserted buckets contiguous', () => {
    const result = fillStatisticGaps([bucket(0, HOUR), bucket(4 * HOUR, 5 * HOUR)]);

    for (let i = 1; i < result.length; i++) {
      expect(Number(result[i].start), `bucket ${i} does not start where ${i - 1} ended`).toBe(Number(result[i - 1].end));
    }
  });

  it('never emits a bucket that overshoots the following real bucket', () => {
    // 90 minute gap with a 60 minute period: the final filler must be clamped.
    const result = fillStatisticGaps([bucket(0, HOUR), bucket(HOUR * 2.5, HOUR * 3.5)]);

    expect(result).toHaveLength(4);
    expect(Number(result[result.length - 2].end)).toBe(HOUR * 2.5);
    expect(Number(result[result.length - 1].start)).toBe(HOUR * 2.5);
  });

  it('handles a single bucket and an empty series', () => {
    const single = [bucket(0, HOUR)];
    expect(fillStatisticGaps(single)).toEqual(single);
    expect(fillStatisticGaps([])).toEqual([]);
  });

  it('does not loop forever on a zero-length period', () => {
    // A malformed bucket (start === end) would make the step 0; the guard must
    // skip filling rather than spin.
    const result = fillStatisticGaps([bucket(0, HOUR), bucket(5 * HOUR, 5 * HOUR)]);
    expect(result).toHaveLength(2);
  });

  it('preserves the values of the real buckets', () => {
    const result = fillStatisticGaps([bucket(0, HOUR, 42), bucket(2 * HOUR, 3 * HOUR, 7)]);

    expect(result[0].mean).toBe(42);
    expect(result[2].mean).toBe(7);
  });
});
