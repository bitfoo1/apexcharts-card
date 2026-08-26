#!/usr/bin/env node
/*
 * Completes Home Assistant's onboarding for the local dev instance, so bringing
 * the container up is one command instead of a click-through that has to be
 * repeated every time the config directory is thrown away.
 *
 * Credentials are dev/dev by design: the instance is bound to 127.0.0.1, holds
 * synthetic data only, and is meant to be deleted. Never point this at anything
 * else.
 *
 * Usage: node dev/docker/bootstrap.mjs [base-url]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:8124';
const CLIENT_ID = `${BASE}/`;
const USER = { name: 'Dev', username: 'dev', password: 'dev', language: 'de' };

async function json(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`${BASE}/manifest.json`);
      if (res.ok) return;
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Home Assistant did not answer at ${BASE} within 120s`);
}

await waitForApi();

const LOGIN_HINT = `open ${BASE} and log in as ${USER.username}/${USER.password} (or rely on the trusted-network auto-login)`;

/*
 * Home Assistant unregisters the entire onboarding API once onboarding is
 * finished, so a 404 here means "already done" rather than "broken" — which is
 * what made a second `mise run dev:ha` report 'onboarding failed (404)'.
 */
const onboarding = await json('/api/onboarding');
if (onboarding.status === 404) {
  console.log(`already onboarded — ${LOGIN_HINT}`);
  process.exit(0);
}

const steps = Array.isArray(onboarding.body) ? onboarding.body : [];
const userStep = steps.find((s) => s.step === 'user');

if (userStep?.done) {
  console.log(`already onboarded — ${LOGIN_HINT}`);
  process.exit(0);
}

const created = await json('/api/onboarding/users', { client_id: CLIENT_ID, ...USER });
if (created.status === 404) {
  // Raced with another bootstrap, or onboarding completed between the two calls.
  console.log(`already onboarded — ${LOGIN_HINT}`);
  process.exit(0);
}
if (created.status !== 200 || !created.body?.auth_code) {
  console.error(`onboarding failed (${created.status}):`, created.body);
  process.exit(1);
}

// Exchange the auth code for a token, so the remaining steps can be posted.
const tokenRes = await fetch(`${BASE}/auth/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: created.body.auth_code,
    client_id: CLIENT_ID,
  }),
});
const token = (await tokenRes.json()).access_token;

// core: location and units. analytics: opt out. integration: finish the wizard.
await json('/api/onboarding/core_config', {}, token);
await json('/api/onboarding/analytics', {}, token);
await json('/api/onboarding/integration', { client_id: CLIENT_ID, redirect_uri: CLIENT_ID }, token);

console.log(`onboarded. ${LOGIN_HINT}`);
