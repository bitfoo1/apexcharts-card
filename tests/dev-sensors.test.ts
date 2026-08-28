// @vitest-environment node
//
// Node, not the project-wide jsdom: this file talks to the dev container over
// HTTP, matching tests/dev-dashboard.test.ts.
import { beforeAll, describe, expect, it } from 'vitest';

/*
 * Guards the update rate of the dev instance's synthetic sensors, which the
 * gallery's aggregation cards silently depend on.
 *
 * The regression this exists for: a new `- trigger:` block was inserted in the
 * middle of the template list, so every sensor defined after it moved from the
 * 5-second trigger to a 2-minute one. Nothing failed — the config stayed valid
 * and every card still rendered. But with at most one point per 1-minute bucket,
 * first, last, median, min, max and avg all collapse to the same value, and the
 * "raw / avg / min / max" card silently stopped demonstrating anything.
 *
 * Density, not identity, is what the gallery needs, so this asserts points per
 * minute rather than the YAML shape.
 */
const BASE = process.env.DEV_HA_URL ?? 'http://127.0.0.1:8124';
const CLIENT_ID = `${BASE}/`;
const WINDOW_MINUTES = 4;

/** Sensors the gallery groups by minute, with the minimum density each needs. */
const EXPECTED: { entity: string; minPerMinute: number; why: string }[] = [
  { entity: 'sensor.dev_pv_power', minPerMinute: 4, why: 'aggregation cards group it at 1min' },
  { entity: 'sensor.dev_pv_string_1', minPerMinute: 4, why: 'group_by cards and the legend cards use it' },
  // No noise term, so its value changes only when the minute does and the
  // recorder stores one point per minute however often the trigger fires. One
  // per minute is therefore its correct density, not a defect.
  { entity: 'sensor.dev_battery_soc', minPerMinute: 1, why: 'smooth curve, one change per minute' },
];

/** The fill card needs the opposite: a sensor sparse enough to leave buckets empty. */
const SPARSE = { entity: 'sensor.dev_sparse_power', maxPerMinute: 1 };

let token = '';
let reason = '';

async function post(path: string, body: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function login(): Promise<string> {
  const flow = await post('/auth/login_flow', {
    client_id: CLIENT_ID,
    handler: ['homeassistant', null],
    redirect_uri: CLIENT_ID,
  });
  const step = await post(`/auth/login_flow/${flow.flow_id}`, {
    client_id: CLIENT_ID,
    username: 'dev',
    password: 'dev',
  });
  if (!step.result) throw new Error(`login failed: ${JSON.stringify(step)}`);
  const tokens = await (
    await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: step.result,
        client_id: CLIENT_ID,
      }),
    })
  ).json();
  return tokens.access_token;
}

/**
 * Points per wall-clock minute over the window, including minutes with none.
 *
 * Counting the empty minutes is the point: a sensor that moved to a 2-minute
 * trigger still reports one point in the minutes it fires, so a check over only
 * the minutes present in the history would pass. The partial first and last
 * minutes are excluded, so a run started mid-minute does not read as a gap.
 */
async function pointsPerMinute(entity: string): Promise<number[]> {
  const now = Date.now();
  const since = new Date(now - WINDOW_MINUTES * 60000).toISOString();
  const url =
    `${BASE}/api/history/period/${since}` +
    `?filter_entity_id=${entity}&minimal_response&significant_changes_only=0`;
  const history = await (await fetch(url, { headers: { authorization: `Bearer ${token}` } })).json();

  const minuteKey = (ms: number) => new Date(ms).toISOString().slice(0, 16);
  const complete: string[] = [];
  for (let i = 1; i < WINDOW_MINUTES; i++) complete.push(minuteKey(now - i * 60000));
  const counts = new Map(complete.map((key) => [key, 0]));

  for (const point of history[0] ?? []) {
    const key = String(point.last_changed ?? point.lu).slice(0, 16);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()];
}

beforeAll(async () => {
  try {
    token = await login();
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
    console.warn(`[dev-sensors] skipping: ${BASE} unreachable (${reason}) — run \`mise run dev:ha\``);
  }
}, 30000);

describe('dev instance sensor density', () => {
  it('is reachable, or explains why it was skipped', () => {
    if (!token) expect(reason).not.toBe('');
  });

  for (const { entity, minPerMinute, why } of EXPECTED) {
    it(`${entity} updates often enough to fill a 1-minute bucket (${why})`, async () => {
      if (!token) return;
      const counts = await pointsPerMinute(entity);
      expect(counts.length, `no complete minute of history for ${entity}`).toBeGreaterThan(0);
      expect(Math.min(...counts), `points per minute: ${JSON.stringify(counts)}`).toBeGreaterThanOrEqual(
        minPerMinute,
      );
    }, 20000);
  }

  it(`${SPARSE.entity} stays sparse, so group_by.fill has empty buckets to act on`, async () => {
    if (!token) return;
    const counts = await pointsPerMinute(SPARSE.entity);
    expect(counts.length, `no complete minute of history for ${SPARSE.entity}`).toBeGreaterThan(0);
    expect(Math.max(...counts), `points per minute: ${JSON.stringify(counts)}`).toBeLessThanOrEqual(
      SPARSE.maxPerMinute,
    );
  }, 20000);
});
