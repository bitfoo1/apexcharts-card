/*
 * Minimal stand-ins for the Home Assistant frontend, so the card can be
 * developed in a plain browser: no Home Assistant, no HACS, no release.
 *
 * The card's contact surface with HA is small (verified by grepping src/):
 *   hass.states, hass.language, hass.locale, hass.config.time_zone,
 *   hass.callApi('GET', 'history/period/...')          -> raw history
 *   hass.callWS({type: 'recorder/statistics_during_period', ...})
 * plus the <ha-card> element it renders into. That is all this file fakes.
 *
 * The generated series are deterministic per entity id, so a reload shows the
 * same curve and a visual change is attributable to the code, not to new data.
 */

/** <ha-card> stand-in: the same box model and CSS variables the real one exposes. */
class DevHaCard extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: var(--ha-card-border-radius, 12px);
          border: var(--ha-card-border-width, 1px) solid var(--divider-color, #e0e0e0);
          box-shadow: var(--ha-card-box-shadow, none);
          color: var(--primary-text-color, #212121);
          position: relative;
        }
      </style>
      <slot></slot>`;
  }
}
if (!customElements.get('ha-card')) customElements.define('ha-card', DevHaCard);

/** Deterministic pseudo-random generator, so reloads produce identical data. */
function seeded(seed) {
  let value = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 2147483647, 7);
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

/**
 * A day of 1-minute samples following a rough solar bell curve, so charts look
 * like the PV data this card is usually pointed at.
 */
function generateSeries(entityId, { unit = 'W', peak = 800, noise = 0.15 } = {}) {
  const random = seeded(entityId);
  const now = Date.now();
  const step = 60_000;
  const points = [];
  for (let t = now - 36 * 3600_000; t <= now; t += step) {
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    const bell = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const value = bell * peak * (1 - noise + random() * noise * 2);
    points.push([t, Math.round(value * 10) / 10]);
  }
  return { points, unit };
}

const ENTITIES = {
  'sensor.pv_string_1': { name: 'PV1 Sued', peak: 420 },
  'sensor.pv_string_2': { name: 'PV2 Sued', peak: 390 },
  'sensor.pv_string_3': { name: 'PV3 Ost', peak: 260 },
  'sensor.pv_string_4': { name: 'PV4 West', peak: 240 },
  'sensor.pv_power': { name: 'PV Gesamt', peak: 1200 },
  'sensor.house_consumption': { name: 'Hausverbrauch', peak: 700, noise: 0.6 },
  'sensor.battery_soc': { name: 'Batterie', peak: 100, unit: '%', noise: 0.05 },
};

const series = Object.fromEntries(
  Object.entries(ENTITIES).map(([id, cfg]) => [id, generateSeries(id, cfg)]),
);

function lastValue(id) {
  const { points } = series[id];
  return points[points.length - 1][1];
}

/** Mimics /api/history/period, which returns one array of states per entity. */
function historyResponse(entityId, start, end) {
  const { points, unit } = series[entityId];
  const from = start ? new Date(start).getTime() : 0;
  const to = end ? new Date(end).getTime() : Date.now();
  return [
    points
      .filter(([t]) => t >= from && t <= to)
      .map(([t, value]) => ({
        entity_id: entityId,
        state: String(value),
        last_changed: new Date(t).toISOString(),
        last_updated: new Date(t).toISOString(),
        attributes: { unit_of_measurement: unit },
      })),
  ];
}

/** Mimics recorder/statistics_during_period: buckets with mean/min/max/sum. */
function statisticsResponse(statisticIds, start, end, period) {
  const sizes = { '5minute': 300_000, hour: 3600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000 };
  const size = sizes[period] ?? 3600_000;
  const from = start ? new Date(start).getTime() : Date.now() - 86_400_000;
  const to = end ? new Date(end).getTime() : Date.now();
  const out = {};
  for (const id of statisticIds) {
    if (!series[id]) continue;
    const buckets = [];
    for (let bucketStart = Math.ceil(from / size) * size; bucketStart < to; bucketStart += size) {
      const inBucket = series[id].points.filter(([t]) => t >= bucketStart && t < bucketStart + size).map(([, v]) => v);
      if (!inBucket.length) continue;
      const mean = inBucket.reduce((a, b) => a + b, 0) / inBucket.length;
      buckets.push({
        statistic_id: id,
        start: bucketStart,
        end: bucketStart + size,
        mean: Math.round(mean * 10) / 10,
        min: Math.min(...inBucket),
        max: Math.max(...inBucket),
        sum: null,
        state: Math.round(mean * 10) / 10,
        change: null,
        last_reset: null,
      });
    }
    out[id] = buckets;
  }
  return out;
}

export function createMockHass({ language = 'de', timeZone = 'Europe/Berlin' } = {}) {
  const states = Object.fromEntries(
    Object.entries(ENTITIES).map(([id, cfg]) => [
      id,
      {
        entity_id: id,
        state: String(lastValue(id)),
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        attributes: {
          friendly_name: cfg.name,
          unit_of_measurement: cfg.unit ?? 'W',
          device_class: (cfg.unit ?? 'W') === '%' ? 'battery' : 'power',
          state_class: 'measurement',
        },
      },
    ]),
  );

  return {
    states,
    language,
    locale: { language, number_format: 'language', time_format: 'language' },
    config: { time_zone: timeZone },
    themes: { darkMode: true },
    async callApi(method, path) {
      globalThis.devLog?.('callApi', method, path);
      const [, query = ''] = path.split('?');
      const params = new URLSearchParams(query);
      const entityId = params.get('filter_entity_id');
      const start = path.match(/history\/period\/([^?]+)/)?.[1];
      const response = historyResponse(entityId, start && decodeURIComponent(start), params.get('end_time'));
      globalThis.devLog?.('  ->', entityId, response[0]?.length ?? 0, 'states');
      return response;
    },
    async callWS(message) {
      if (message.type === 'recorder/statistics_during_period') {
        return statisticsResponse(message.statistic_ids, message.start_time, message.end_time, message.period);
      }
      console.warn('[dev] unhandled callWS', message);
      return {};
    },
  };
}

export const mockEntities = ENTITIES;
