import { describe, expect, it } from 'vitest';
import momentTz from 'moment-timezone';
import { computeTimezoneDiffWithLocal, endOfInTimezone, startOfInTimezone } from '../src/utils';
import { moment } from '../src/const';

/*
 * moment-timezone is the oracle here, and only here: the card used to derive its
 * zone offsets from that library, whose zone database cost 696 KB of the bundle —
 * 38 % of it. The implementation now reads the same data from `Intl`, which the
 * browser ships anyway, so the library survives as a test-only dependency whose
 * single job is to state what the old behaviour was.
 *
 * Both sides are evaluated against the same ambient local zone, so the assertions
 * hold whatever TZ the suite runs under. Verified under Europe/Berlin, UTC, America/New_York, Asia/Kolkata,
 * Australia/Lord_Howe and Pacific/Chatham.
 */

/** Zones chosen for their offsets, not their populations. */
const ZONES = [
  'UTC',
  'Europe/Berlin', // DST, whole hour
  'America/New_York', // DST, negative offset
  'Asia/Kolkata', // no DST, half hour
  'America/St_Johns', // DST, negative half hour
  'Pacific/Chatham', // DST, quarter hour (+12:45 / +13:45)
  'Australia/Lord_Howe', // DST shift of only 30 minutes
  'Pacific/Kiritimati', // +14, the far end
  'America/Sao_Paulo', // dropped DST in 2019
  'Asia/Tokyo',
];

/** Instants around DST transitions in both hemispheres, plus ordinary days. */
const INSTANTS = [
  '2026-01-15T12:00:00Z',
  '2026-03-29T00:30:00Z', // European spring-forward
  '2026-03-29T02:30:00Z',
  '2026-10-25T00:30:00Z', // European fall-back
  '2026-11-01T05:30:00Z', // North American fall-back
  '2026-04-05T15:00:00Z', // Chatham / Lord Howe autumn
  '2026-06-21T23:59:59Z',
  '2026-09-30T08:15:00Z',
].map((s) => new Date(s));

const oracleDiff = (zone: string, at: Date) =>
  (momentTz(at).utcOffset() - momentTz(at).tz(zone).utcOffset()) * 60 * 1000;

describe('computeTimezoneDiffWithLocal', () => {
  it('matches moment-timezone for every zone and instant', () => {
    const mismatches: string[] = [];
    for (const zone of ZONES) {
      for (const at of INSTANTS) {
        const actual = computeTimezoneDiffWithLocal(zone, at);
        const expected = oracleDiff(zone, at);
        if (actual !== expected) {
          mismatches.push(`${zone} @ ${at.toISOString()}: ${actual} !== ${expected}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('reports no difference without a zone', () => {
    expect(computeTimezoneDiffWithLocal(undefined)).toBe(0);
    expect(computeTimezoneDiffWithLocal('')).toBe(0);
  });

  it('falls back to local time for a zone the runtime rejects', () => {
    // Home Assistant reports its zone as a plain string; a broken one must not
    // stop the card from rendering.
    expect(computeTimezoneDiffWithLocal('Not/AZone')).toBe(0);
  });

  it('answers per instant, so a DST transition changes the result', () => {
    const beforeSpringForward = computeTimezoneDiffWithLocal('Europe/Berlin', new Date('2026-03-01T12:00:00Z'));
    const afterSpringForward = computeTimezoneDiffWithLocal('Europe/Berlin', new Date('2026-04-01T12:00:00Z'));
    const localHasDstToo = new Date('2026-03-01T12:00:00Z').getTimezoneOffset() !== new Date('2026-04-01T12:00:00Z').getTimezoneOffset();
    // Under a local zone that shifts alongside Berlin the difference stays put;
    // that is the point of the assertion below being conditional.
    if (localHasDstToo) {
      expect(afterSpringForward).toBe(beforeSpringForward);
    } else {
      expect(afterSpringForward).not.toBe(beforeSpringForward);
    }
  });
});

describe('startOfInTimezone / endOfInTimezone', () => {
  const UNITS = ['minute', 'hour', 'day', 'isoWeek', 'week', 'month', 'year'] as const;

  it('matches moment-timezone startOf for every unit, zone and instant', () => {
    const mismatches: string[] = [];
    for (const unit of UNITS) {
      for (const zone of ZONES) {
        for (const at of INSTANTS) {
          const actual = startOfInTimezone(at, zone, unit).getTime();
          const expected = momentTz(at).tz(zone).startOf(unit).toDate().getTime();
          if (actual !== expected) {
            mismatches.push(`startOf(${unit}) ${zone} @ ${at.toISOString()}: ${actual - expected}ms off`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('matches moment-timezone endOf for every unit, zone and instant', () => {
    const mismatches: string[] = [];
    for (const unit of UNITS) {
      for (const zone of ZONES) {
        for (const at of INSTANTS) {
          const actual = endOfInTimezone(at, zone, unit).getTime();
          const expected = momentTz(at).tz(zone).endOf(unit).toDate().getTime();
          if (actual !== expected) {
            mismatches.push(`endOf(${unit}) ${zone} @ ${at.toISOString()}: ${actual - expected}ms off`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('without a zone, behaves like plain local moment', () => {
    const at = new Date('2026-05-04T10:20:30Z');
    expect(startOfInTimezone(at, undefined, 'day').getTime()).toBe(moment(at).startOf('day').valueOf());
    expect(endOfInTimezone(at, undefined, 'day').getTime()).toBe(moment(at).endOf('day').valueOf());
  });

  it('falls back to local time for a zone the runtime rejects', () => {
    const at = new Date('2026-05-04T10:20:30Z');
    expect(startOfInTimezone(at, 'Not/AZone', 'day').getTime()).toBe(moment(at).startOf('day').valueOf());
  });

  it('does not mutate the instant it was given', () => {
    const at = new Date('2026-05-04T10:20:30Z');
    const before = at.getTime();
    startOfInTimezone(at, 'Asia/Tokyo', 'month');
    expect(at.getTime()).toBe(before);
  });
});
