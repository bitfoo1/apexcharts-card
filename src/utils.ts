import { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { compress as lzStringCompress, decompress as lzStringDecompress } from 'lz-string';
import { ChartCardConfig, EntityCachePoints } from './types';
import { TinyColor } from '@ctrl/tinycolor';
import parse from 'parse-duration';
import {
  ChartCardExternalConfig,
  ChartCardPrettyTime,
  ChartCardSeriesExternalConfig,
  ChartCardStartEnd,
} from './types-config';
import { DEFAULT_FLOAT_PRECISION, DEFAULT_MAX, DEFAULT_MIN, moment, NO_VALUE } from './const';
import { formatNumber, FrontendLocaleData, HomeAssistant } from 'custom-card-helpers';
import { OverrideFrontendLocaleData } from './types-ha';

export function compress(data: unknown): string {
  return lzStringCompress(JSON.stringify(data));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decompress(data: unknown | undefined): any | undefined {
  if (data !== undefined && typeof data === 'string') {
    const dec = lzStringDecompress(data);
    return dec && JSON.parse(dec);
  }
  return data;
}

export function getMilli(hours: number): number {
  return hours * 60 ** 2 * 10 ** 3;
}

export function log(message: unknown): void {
  // eslint-disable-next-line no-console
  console.warn('apexcharts-card: ', message);
}

/**
 * Performs a deep merge of `source` into `target`.
 * Mutates `target` only but not its objects and arrays.
 *
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function mergeDeep(target: any, source: any): any {
  const isObject = (obj) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}

export function computeName(
  index: number,
  series: ChartCardSeriesExternalConfig[] | undefined,
  entities: (HassEntity | undefined)[] | HassEntities | undefined = undefined,
  entity: HassEntity | undefined = undefined,
): string {
  if (!series || (!entities && !entity)) return '';
  let name = '';
  if (entity) {
    name = series[index].name || entity.attributes?.friendly_name || entity.entity_id || '';
  } else if (entities) {
    name = series[index].name || entities[index]?.attributes?.friendly_name || entities[index]?.entity_id || '';
  }
  return name + (series[index].show?.offset_in_name && series[index].offset ? ` (${series[index].offset})` : '');
}

export function computeUom(
  index: number,
  series: ChartCardSeriesExternalConfig[] | undefined,
  entities: HassEntity[] | undefined[] | undefined = undefined,
  entity: HassEntity | undefined = undefined,
): string {
  if (!series || (!entities && !entity)) return '';
  if (entity) {
    return series[index].unit || entity.attributes?.unit_of_measurement || '';
  } else if (entities) {
    return series[index].unit || entities[index]?.attributes?.unit_of_measurement || '';
  }
  return '';
}

export function computeColors(colors: string[] | undefined): string[] {
  if (!colors) return [];
  return colors.map((color) => {
    return computeColor(color);
  });
}

export function computeColor(color: string): string {
  if (color[0] === '#') {
    return new TinyColor(color).toHexString();
  } else if (color.substring(0, 3) === 'var') {
    return new TinyColor(
      window.getComputedStyle(document.documentElement).getPropertyValue(color.substring(4).slice(0, -1)).trim(),
    ).toHexString();
  } else {
    return new TinyColor(color).toHexString();
  }
}

export function computeTextColor(backgroundColor: string): string {
  const colorObj = new TinyColor(backgroundColor);
  if (colorObj.isValid && colorObj.isLight()) {
    return '#000'; // bright colors - black font
  } else {
    return '#fff'; // dark colors - white font
  }
}

export function validateInterval(interval: string, prefix: string): number {
  const parsed = parse(interval);
  if (parsed === null) {
    throw new Error(`'${prefix}: ${interval}' is not a valid range of time`);
  }
  return parsed;
}

export function validateOffset(interval: string, prefix: string): number {
  if (interval[0] !== '+' && interval[0] !== '-') {
    throw new Error(`'${prefix}: ${interval}' should start with a '+' or a '-'`);
  }
  return validateInterval(interval, prefix);
}

export function offsetData(data: EntityCachePoints, offset: number | undefined): EntityCachePoints {
  if (offset) {
    return data.map((entry) => {
      return [entry[0] - offset, entry[1]];
    });
  }
  return data;
}

export function prettyPrintTime(value: string | number | null, unit: ChartCardPrettyTime): string {
  if (value === null) return NO_VALUE;
  return moment.duration(value, unit).format('y[y] d[d] h[h] m[m] s[s] S[ms]', { trim: 'both' });
}

export function getPercentFromValue(value: number, min: number | undefined, max: number | undefined): number {
  const lMin = min === undefined ? DEFAULT_MIN : min;
  const lMax = max === undefined ? DEFAULT_MAX : max;
  return ((value - lMin) * 100) / (lMax - lMin);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLovelace(): any | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let root: any = document.querySelector('home-assistant');
  root = root && root.shadowRoot;
  root = root && root.querySelector('home-assistant-main');
  root = root && root.shadowRoot;
  root = root && root.querySelector('app-drawer-layout partial-panel-resolver, ha-drawer partial-panel-resolver');
  root = (root && root.shadowRoot) || root;
  root = root && root.querySelector('ha-panel-lovelace');
  root = root && root.shadowRoot;
  root = root && root.querySelector('hui-root');
  if (root) {
    const ll = root.lovelace;
    ll.current_view = root.___curView;
    return ll;
  }
  return null;
}

export function interpolateColor(a: string, b: string, factor: number): string {
  const ah = +a.replace('#', '0x');
  const ar = ah >> 16;
  const ag = (ah >> 8) & 0xff;
  const ab = ah & 0xff;
  const bh = +b.replace('#', '0x');
  const br = bh >> 16;
  const bg = (bh >> 8) & 0xff;
  const bb = bh & 0xff;
  const rr = ar + factor * (br - ar);
  const rg = ag + factor * (bg - ag);
  const rb = ab + factor * (bb - ab);

  return `#${(((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function mergeConfigTemplates(ll: any, config: ChartCardExternalConfig): ChartCardExternalConfig {
  const tpl = config.config_templates;
  if (!tpl) return config;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = {};
  const tpls = tpl && Array.isArray(tpl) ? tpl : [tpl];
  tpls?.forEach((template) => {
    if (!ll.config.apexcharts_card_templates?.[template])
      throw new Error(`apexchart-card template '${template}' is missing from your config!`);
    const res = mergeConfigTemplates(ll, JSON.parse(JSON.stringify(ll.config.apexcharts_card_templates[template])));
    result = mergeDeepConfig(result, res);
  });
  result = mergeDeepConfig(result, config);
  return result as ChartCardExternalConfig;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function mergeDeepConfig(target: any, source: any): any {
  const isObject = (obj) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = mergeDeepConfig(targetValue, sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeepConfig(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}

export function is12HourFromLocale(locale: string): boolean {
  return !(new Date(2021, 1, 1, 15, 0, 0, 0).toLocaleTimeString(locale).indexOf('15') > -1);
}

export function is12Hour(config: ChartCardConfig | undefined, hass: HomeAssistant | undefined): boolean {
  if (config?.hours_12 !== undefined) {
    return config.hours_12;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hassLocale = (hass as any)?.locale;
    if (hassLocale?.time_format) {
      if (hassLocale.time_format === 'language') {
        return is12HourFromLocale(hassLocale.language);
      } else if (hassLocale.time_format === 'system') {
        return is12HourFromLocale(navigator.language);
      } else {
        return hassLocale.time_format === '12';
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return is12HourFromLocale(getLang(config, hass));
    }
  }
}

export function formatApexDate(
  config: ChartCardConfig,
  hass: HomeAssistant | undefined,
  value: Date,
  withDate = true,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hours12 = is12Hour(config, hass) ? { hour12: true } : { hourCycle: 'h23' };
  const lang = getLang(config, hass);
  if (withDate) {
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      ...hours12,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).format(value);
  } else {
    return new Intl.DateTimeFormat(lang, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      ...hours12,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).format(value);
  }
}

export function getLang(config: ChartCardConfig | undefined, hass: HomeAssistant | undefined): string {
  return config?.locale || hass?.language || 'en';
}

export function truncateFloat(
  value: string | number | null | undefined,
  precision: number | undefined,
): string | number | null {
  let lValue: string | number | null | undefined = value;
  if (lValue === undefined) return null;
  if (typeof lValue === 'string') {
    lValue = parseFloat(lValue);
    if (Number.isNaN(lValue)) {
      return lValue;
    }
  }
  if (lValue !== null && typeof lValue === 'number' && !Number.isInteger(lValue)) {
    lValue = (lValue as number).toFixed(precision === undefined ? DEFAULT_FLOAT_PRECISION : precision);
  }
  return lValue;
}

export function myFormatNumber(
  num: string | number | null | undefined,
  localeOptions?: FrontendLocaleData,
  precision?: number | undefined,
): string | null {
  let lValue: string | number | null | undefined = num;
  if (lValue === undefined || lValue === null) return null;
  if (typeof lValue === 'string') {
    lValue = parseFloat(lValue);
    if (Number.isNaN(lValue)) {
      return num as string;
    }
  }
  return formatNumber(lValue, localeOptions, {
    maximumFractionDigits: precision === undefined ? DEFAULT_FLOAT_PRECISION : precision,
  });
}

/**
 * Offset of a named time zone against the browser's own, in milliseconds, at a
 * given instant.
 *
 * Uses `Intl` rather than moment-timezone because that library's zone database
 * costs 696 KB of the bundle — 38 % of it — and the card needs nothing from it
 * but this offset. `Intl` reads the zone data the browser already ships.
 *
 * `at` is a parameter because an offset is only valid for an instant: a zone that
 * observes DST answers differently on either side of a transition, so a caller
 * computing a boundary has to ask about that boundary rather than about now.
 */
export function computeTimezoneDiffWithLocal(timezone: string | undefined, at: Date = new Date()): number {
  if (!timezone) return 0;
  const zoneOffsetMinutes = zoneUtcOffsetInMinutes(timezone, at);
  if (zoneOffsetMinutes === undefined) return 0;
  return (-at.getTimezoneOffset() - zoneOffsetMinutes) * 60 * 1000;
}

/**
 * A zone's UTC offset in minutes, or undefined if the runtime rejects the zone.
 *
 * Home Assistant reports its configured zone as a plain string, and an
 * unrecognised one makes `Intl` throw rather than fall back — the card must keep
 * rendering in local time instead of failing, which is what moment-timezone did.
 */
function zoneUtcOffsetInMinutes(timezone: string, at: Date): number | undefined {
  let formatted: string;
  try {
    formatted =
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
        .formatToParts(at)
        .find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return undefined;
  }
  // "GMT+02:00", "GMT-05:30", "GMT+05:45" — and bare "GMT" for UTC itself.
  const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(formatted);
  if (!match) return undefined;
  if (!match[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/**
 * The wall clock a named zone shows at an instant, as plain calendar fields.
 *
 * Fields rather than a Date on purpose: a Date is always an instant in some zone,
 * and the whole point here is to do calendar arithmetic that no zone interferes
 * with. `en-CA` because it formats as ISO-like fixed-width numbers.
 */
function wallClockInZone(at: Date, timezone: string): WallClock | undefined {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
  } catch {
    return undefined;
  }
  const field = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wc = {
    year: field('year'),
    month: field('month'),
    day: field('day'),
    hour: field('hour'),
    minute: field('minute'),
    second: field('second'),
    ms: at.getMilliseconds(),
  };
  return Object.values(wc).some((v) => Number.isNaN(v)) ? undefined : wc;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

/** The wall clock treated as if it were UTC, which is what makes it arithmetic. */
function wallClockAsUtc(wc: WallClock): number {
  return Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second, wc.ms);
}

function utcAsWallClock(ms: number): WallClock {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

/**
 * The instant at which a named zone shows the given wall clock.
 *
 * A wall clock is not a unique instant twice a year. When the clocks go back an
 * hour, every wall clock in that hour happens twice, and the two candidate
 * offsets are the ones in force a day either side; the earlier instant is chosen,
 * matching moment-timezone, so a `span: {start: day}` chart does not jump an hour
 * on that one morning. When the clocks go forward, the skipped wall clock has no
 * instant at all, no candidate validates, and the fallback resolves to the hour
 * after the gap — again what moment-timezone answers.
 */
function instantFromWallClock(wc: WallClock, timezone: string): Date {
  const asUtc = wallClockAsUtc(wc);
  const surroundingOffsets = [
    zoneUtcOffsetInMinutes(timezone, new Date(asUtc - 86_400_000)),
    zoneUtcOffsetInMinutes(timezone, new Date(asUtc + 86_400_000)),
  ].filter((offset): offset is number => offset !== undefined);
  const valid = [...new Set(surroundingOffsets)]
    .map((offset) => ({ offset, instant: asUtc - offset * 60_000 }))
    .filter(({ offset, instant }) => zoneUtcOffsetInMinutes(timezone, new Date(instant)) === offset)
    .map(({ instant }) => instant);
  if (valid.length > 0) return new Date(Math.min(...valid));

  const firstGuess = zoneUtcOffsetInMinutes(timezone, new Date(asUtc)) ?? 0;
  const firstInstant = asUtc - firstGuess * 60_000;
  const secondGuess = zoneUtcOffsetInMinutes(timezone, new Date(firstInstant)) ?? 0;
  return new Date(secondGuess === firstGuess ? firstInstant : asUtc - secondGuess * 60_000);
}

const WALL_CLOCK_UNIT_MS: Partial<Record<ChartCardStartEnd, number>> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  isoWeek: 7 * 86_400_000,
};

/**
 * Truncates a wall clock down to the start of the unit containing it.
 *
 * `week` follows moment's locale, which is what the local code path does, so the
 * two agree when a dashboard switches between local and server time.
 */
function startOfWallClock(wc: WallClock, unit: ChartCardStartEnd): WallClock {
  const truncated = { ...wc, ms: 0 };
  if (unit === 'minute') return { ...truncated, second: 0 };
  const toHour = { ...truncated, second: 0, minute: 0 };
  if (unit === 'hour') return toHour;
  const toDay = { ...toHour, hour: 0 };
  if (unit === 'day') return toDay;
  if (unit === 'week' || unit === 'isoWeek') {
    const weekday = new Date(Date.UTC(wc.year, wc.month - 1, wc.day)).getUTCDay();
    const firstDay = unit === 'isoWeek' ? 1 : moment.localeData().firstDayOfWeek();
    const back = (weekday - firstDay + 7) % 7;
    return utcAsWallClock(wallClockAsUtc(toDay) - back * 86_400_000);
  }
  if (unit === 'month') return { ...toDay, day: 1 };
  return { ...toDay, day: 1, month: 1 };
}

function startOfNextWallClock(start: WallClock, unit: ChartCardStartEnd): WallClock {
  const fixed = WALL_CLOCK_UNIT_MS[unit];
  if (fixed !== undefined) return utcAsWallClock(wallClockAsUtc(start) + fixed);
  if (unit === 'month') {
    return start.month === 12 ? { ...start, year: start.year + 1, month: 1 } : { ...start, month: start.month + 1 };
  }
  return { ...start, year: start.year + 1 };
}

/**
 * Start of the unit containing `at`, as read by a clock in `timezone`.
 *
 * Without a zone this is plain local moment, so a dashboard following the browser
 * keeps behaving exactly as before.
 */
export function startOfInTimezone(at: Date, timezone: string | undefined, unit: ChartCardStartEnd): Date {
  const wc = timezone ? wallClockInZone(at, timezone) : undefined;
  if (!timezone || !wc) return moment(at).startOf(unit).toDate();
  return instantFromWallClock(startOfWallClock(wc, unit), timezone);
}

/**
 * Last millisecond of the unit containing `at`, as read by a clock in `timezone`.
 *
 * Derived as the last wall clock *inside* the unit rather than as the next unit's
 * start minus a millisecond, because those two differ exactly where it matters.
 * When the clocks go back, 02:59:59.999 is followed by 02:00 again, not by 03:00:
 * subtracting a millisecond from the next start lands an hour late, while asking
 * for 02:59:59.999 and resolving that wall clock to its earliest instant lands on
 * the edge of the hour the caller is actually in. On a day the transition
 * shortens or lengthens, the same expression still yields 23:59:59.999 of that
 * day, which is why it is not special-cased per unit.
 */
export function endOfInTimezone(at: Date, timezone: string | undefined, unit: ChartCardStartEnd): Date {
  const wc = timezone ? wallClockInZone(at, timezone) : undefined;
  if (!timezone || !wc) return moment(at).endOf(unit).toDate();
  const nextStart = startOfNextWallClock(startOfWallClock(wc, unit), unit);
  return instantFromWallClock(utcAsWallClock(wallClockAsUtc(nextStart) - 1), timezone);
}

export function isUsingServerTimezone(/*config: ChartCardConfig, */ hass: HomeAssistant | undefined): boolean {
  return (hass?.locale as OverrideFrontendLocaleData).time_zone === 'server';
}
