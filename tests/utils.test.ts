import { describe, expect, it } from 'vitest';
import {
  computeName,
  computeUom,
  getPercentFromValue,
  interpolateColor,
  is12HourFromLocale,
  mergeDeep,
  mergeDeepConfig,
  offsetData,
  prettyPrintTime,
  truncateFloat,
  validateInterval,
  validateOffset,
} from '../src/utils';

describe('mergeDeep', () => {
  it('merges nested objects without mutating the source', () => {
    const source = { apex_config: { chart: { height: 300 } } };
    const result = mergeDeep({ apex_config: { chart: { width: 100 } } }, source);

    expect(result).toEqual({ apex_config: { chart: { width: 100, height: 300 } } });
    expect(source).toEqual({ apex_config: { chart: { height: 300 } } });
  });

  it('concatenates arrays, which is what apex_config layering relies on', () => {
    expect(mergeDeep({ series: [1] }, { series: [2] })).toEqual({ series: [1, 2] });
  });

  it('returns the source when either side is not an object', () => {
    expect(mergeDeep(undefined, { a: 1 })).toEqual({ a: 1 });
    expect(mergeDeep({ a: 1 }, 5)).toBe(5);
  });
});

describe('mergeDeepConfig', () => {
  it('merges arrays element-wise instead of concatenating them', () => {
    // Config templates must override series entry N, not append a new one.
    const result = mergeDeepConfig({ series: [{ entity: 'sensor.a', name: 'A' }] }, { series: [{ name: 'B' }] });

    expect(result).toEqual({ series: [{ entity: 'sensor.a', name: 'B' }] });
  });
});

describe('computeName', () => {
  const series = [{ entity: 'sensor.power' }];

  it('prefers the configured name', () => {
    const named = [{ entity: 'sensor.power', name: 'Grid' }];
    expect(computeName(0, named, undefined, { entity_id: 'sensor.power', attributes: {} } as never)).toBe('Grid');
  });

  it('falls back to friendly_name, then entity_id', () => {
    expect(
      computeName(0, series, undefined, {
        entity_id: 'sensor.power',
        attributes: { friendly_name: 'Power' },
      } as never),
    ).toBe('Power');
    expect(computeName(0, series, undefined, { entity_id: 'sensor.power', attributes: {} } as never)).toBe(
      'sensor.power',
    );
  });

  it('appends the offset when offset_in_name is set', () => {
    const offsetSeries = [{ entity: 'sensor.power', name: 'Yesterday', offset: '-1d', show: { offset_in_name: true } }];
    expect(computeName(0, offsetSeries as never, undefined, { entity_id: 'sensor.power', attributes: {} } as never)).toBe(
      'Yesterday (-1d)',
    );
  });

  it('returns an empty string without series or entities', () => {
    expect(computeName(0, undefined)).toBe('');
    expect(computeName(0, series)).toBe('');
  });
});

describe('computeUom', () => {
  it('prefers the configured unit over the entity unit', () => {
    const series = [{ entity: 'sensor.power', unit: 'kW' }];
    expect(computeUom(0, series, undefined, { attributes: { unit_of_measurement: 'W' } } as never)).toBe('kW');
  });

  it('falls back to the entity unit and then to an empty string', () => {
    const series = [{ entity: 'sensor.power' }];
    expect(computeUom(0, series, undefined, { attributes: { unit_of_measurement: 'W' } } as never)).toBe('W');
    expect(computeUom(0, series, undefined, { attributes: {} } as never)).toBe('');
  });
});

describe('offsetData', () => {
  it('shifts timestamps back by the offset and leaves values alone', () => {
    expect(offsetData([[1000, 5]], 400)).toEqual([[600, 5]]);
  });

  it('returns the input untouched without an offset', () => {
    const data = [[1000, 5]] as never;
    expect(offsetData(data, undefined)).toBe(data);
    expect(offsetData(data, 0)).toBe(data);
  });
});

describe('validateInterval / validateOffset', () => {
  it('parses durations to milliseconds', () => {
    expect(validateInterval('5min', 'group_by')).toBe(300000);
    expect(validateInterval('1h', 'graph_span')).toBe(3600000);
  });

  it('rejects garbage with a message naming the offending option', () => {
    expect(() => validateInterval('nonsense', 'graph_span')).toThrowError(/graph_span: nonsense/);
  });

  it('requires an explicit sign on offsets', () => {
    expect(validateOffset('-12h', 'span.offset')).toBe(-43200000);
    expect(validateOffset('+1d', 'span.offset')).toBe(86400000);
    expect(() => validateOffset('12h', 'span.offset')).toThrowError(/should start with a '\+' or a '-'/);
  });
});

describe('truncateFloat', () => {
  it('applies the precision to floats only', () => {
    expect(truncateFloat(1.23456, 2)).toBe('1.23');
    expect(truncateFloat(42, 2)).toBe(42);
  });

  it('parses numeric strings and passes non-numeric ones through', () => {
    expect(truncateFloat('1.987', 1)).toBe('2.0');
    expect(truncateFloat('unavailable', 1)).toBeNaN();
  });

  it('maps undefined to null so downstream null handling applies', () => {
    expect(truncateFloat(undefined, 1)).toBeNull();
    expect(truncateFloat(null, 1)).toBeNull();
  });
});

describe('getPercentFromValue', () => {
  it('scales a value into its min/max range', () => {
    expect(getPercentFromValue(50, 0, 100)).toBe(50);
    expect(getPercentFromValue(0, -100, 100)).toBe(50);
  });

  it('defaults to a 0..100 range', () => {
    expect(getPercentFromValue(25, undefined, undefined)).toBe(25);
  });
});

describe('prettyPrintTime', () => {
  it('formats a duration and trims empty units', () => {
    expect(prettyPrintTime(90, 'second')).toBe('1m 30s');
    expect(prettyPrintTime(2, 'hour')).toBe('2h');
  });

  it('renders null as the no-value placeholder', () => {
    expect(prettyPrintTime(null, 'second')).toBe('N/A');
  });
});

describe('interpolateColor', () => {
  it('returns the endpoints at factor 0 and 1', () => {
    expect(interpolateColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(interpolateColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('meets in the middle at factor 0.5', () => {
    expect(interpolateColor('#000000', '#ffffff', 0.5)).toBe('#7f7f7f');
  });
});

describe('is12HourFromLocale', () => {
  it('detects 12h and 24h locales', () => {
    expect(is12HourFromLocale('en-US')).toBe(true);
    expect(is12HourFromLocale('de-DE')).toBe(false);
  });
});
