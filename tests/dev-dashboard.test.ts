// @vitest-environment node
//
// Node, not the project-wide jsdom: this file talks to the dev container over a
// WebSocket, and undici's WebSocket dispatches Node Events that jsdom's
// EventTarget rejects ("The 'event' argument must be an instance of Event").
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCheckers } from 'ts-interface-checker';
import exportedTypeSuite from '../src/types-config-ti';

/*
 * Validates the dev dashboard against the card's own config checker, so a
 * "configuration error" in the browser can be attributed to a wrong option
 * rather than to missing data. It caught two mistakes that are invisible in the
 * YAML source:
 *
 *   - an unquoted flow-mapping title containing a comma, which YAML reads as a
 *     second key and the card rejects as an extraneous header option;
 *   - a series relying on `all_series_config.entity`, which does not satisfy
 *     validation because strictCheck runs BEFORE all_series_config is merged, and
 *     `entity` is required on every series entry.
 *
 * The configuration is read from the running dev container (`mise run dev:ha`)
 * rather than from the YAML on disk, because only the parsed form shows what the
 * card actually receives. Without the container these tests skip, so CI stays
 * green without Docker.
 */
const BASE = process.env.DEV_HA_URL ?? 'http://127.0.0.1:8124';
const CLIENT_ID = `${BASE}/`;

type Card = Record<string, unknown> & { type?: string };
type LovelaceConfig = {
  views?: { title?: string; sections?: { cards?: Card[] }[] }[];
  apexcharts_card_templates?: Record<string, Card>;
};

const { ChartCardExternalConfig } = createCheckers(exportedTypeSuite);

let config: LovelaceConfig | undefined;
let reason = '';

async function post(path: string, body: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

/** Logs in with the throwaway dev account and reads the parsed dashboard. */
async function fetchDashboard(): Promise<LovelaceConfig> {
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

  const socket = new WebSocket(`${BASE.replace('http', 'ws')}/api/websocket`);
  return new Promise((resolve, reject) => {
    socket.onerror = () => reject(new Error('websocket error'));
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: tokens.access_token }));
      } else if (message.type === 'auth_ok') {
        socket.send(JSON.stringify({ id: 1, type: 'lovelace/config', url_path: 'lovelace' }));
      } else if (message.type === 'result') {
        socket.close();
        if (message.success) {
          resolve(message.result);
        } else {
          reject(new Error(JSON.stringify(message.error)));
        }
      }
    };
    setTimeout(() => reject(new Error('timed out waiting for lovelace/config')), 15000);
  });
}

beforeAll(async () => {
  try {
    config = await fetchDashboard();
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
    console.warn(`[dev-dashboard] skipping: ${BASE} unreachable (${reason}) — run \`mise run dev:ha\``);
  }
}, 30000);

function cards(): { label: string; card: Card }[] {
  const out: { label: string; card: Card }[] = [];
  for (const view of config?.views ?? []) {
    let index = 0;
    for (const section of view.sections ?? []) {
      for (const card of section.cards ?? []) {
        if (card.type !== 'custom:apexcharts-card') continue;
        const header = card.header as { title?: string } | undefined;
        out.push({ label: `${view.title} #${index++}: ${header?.title ?? '(no title)'}`, card });
      }
    }
  }
  return out;
}

/** Mirrors the card's own template merging, which happens before validation. */
function withTemplates(card: Card): Card {
  const names = card.config_templates;
  if (!names) return card;
  const list = Array.isArray(names) ? names : [names];
  let merged: Card = {};
  for (const name of list) {
    merged = { ...merged, ...(config?.apexcharts_card_templates?.[String(name)] ?? {}) };
  }
  return { ...merged, ...card };
}

describe('dev dashboard', () => {
  it('is reachable, or explains why it was skipped', () => {
    if (!config) {
      expect(reason).not.toBe('');
      return;
    }
    expect(cards().length).toBeGreaterThan(50);
  });

  it('validates every card with the checker the card itself uses', () => {
    if (!config) return;
    const failures: string[] = [];
    for (const { label, card } of cards()) {
      try {
        ChartCardExternalConfig.strictCheck(withTemplates(card));
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(failures, `${failures.length} invalid card configs`).toEqual([]);
  });

  /*
   * Replaces what a generator script used to enforce: the gallery is only useful
   * if every group states what "correct" looks like, so a heading without a
   * review note is a defect.
   */
  it('follows every heading with a review note', () => {
    const yaml = readFileSync('dev/docker/config/ui-lovelace.yaml', 'utf8');
    const groups = yaml.split(/^ {10}- type: heading$/m).slice(1);
    const missing = groups
      .map((group) => ({
        heading: /^ {12}heading: (.+)$/m.exec(group)?.[1] ?? '(unnamed)',
        annotated: /^ {10}- type: markdown$/m.test(group.split(/^ {10}- type: (?!markdown)/m)[0]),
      }))
      .filter((group) => !group.annotated)
      .map((group) => group.heading);

    expect(groups.length).toBeGreaterThan(30);
    expect(missing, 'headings without a markdown review note').toEqual([]);
  });
});
