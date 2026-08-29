# AGENTS.md

Instructions for AI agents working in this repository.

## What this repository is

A **fork** of [`RomRider/apexcharts-card`](https://github.com/RomRider/apexcharts-card),
a Home Assistant Lovelace custom card that renders charts with ApexCharts. The
card is a single Lit web component, bundled by Rollup into one
`dist/apexcharts-card.js` that Home Assistant loads in the browser.

Upstream has been frozen since 2025-08-21 with 27 unmerged pull requests. The
purpose of this fork is **maintenance, not redesign**:

1. keep the card working against current Home Assistant and ApexCharts,
2. adopt fixes from unmerged upstream PRs,
3. add the tests upstream never had.

**Consequence for your work: keep the diff against upstream small.** A future
rebase onto upstream must stay cheap. Prefer a config-level workaround or a
targeted fix over restructuring inherited code. If a lint rule fires on
inherited style, disabling it with a written rationale is usually better than
rewriting 30 upstream lines — see `eslint.config.mjs` for that pattern.

## Repository map

| Path | What lives there |
| --- | --- |
| `src/apexcharts-card.ts` | The Lit component: config parsing, header, update loop, y-axis and threshold computation. The biggest file. |
| `src/graphEntry.ts` | Data layer: history and statistics fetching, caching in localForage, `group_by`, `func`, `data_generator`, `transform`, gap filling. |
| `src/apex-layouts.ts` | Builds the ApexCharts options object from the card config. Locale resolution lives here. |
| `src/layouts/minimal.ts` | The `layout: minimal` variant. |
| `src/types-config.ts` | The user-facing YAML config types. **Generated companion:** `src/types-config-ti.ts` via `npm run build:types-check` — never edit it by hand. |
| `src/utils.ts`, `src/const.ts`, `src/locales.ts`, `src/styles.ts` | Helpers, defaults, ApexCharts locales, CSS. |
| `tests/` | Vitest unit tests. |
| `dev/` | Local dev harness: `index.html` plus `mock-hass.js`, served by `mise run dev`. No Home Assistant needed. |
| `dev/docker/` | A throwaway Home Assistant instance (`mise run dev:ha`) that mounts `dist/` as `/config/www`. `config/` is a live HA config directory; only `configuration.yaml` and `ui-lovelace.yaml` are tracked. |
| `scripts/` | `css-diff.mjs` (stylesheet drift vs the bundled ApexCharts), `tooltip-preview.mjs` (measure the tooltip in a browser), `update_readme.sh` (used by semantic-release). |
| `test/` | **Not tests.** A Home Assistant dev instance config (`configuration.yaml`, `ui-lovelace.yaml`) inherited from upstream. Superseded by `dev/docker/`. |
| `mise.toml` | Pinned toolchain and the task list. |

## Workflow

```bash
mise install          # provision the pinned Node
mise run install      # npm ci
mise run verify       # typecheck + lint + test + bundle. Run this before every commit.
```

`mise run verify` is exactly what CI checks. Do not report work as complete
without it passing.

Individual steps: `mise run typecheck`, `mise run lint`, `mise run test`,
`mise run build`, `mise run clean`.

### Verifying a change without cutting a release

Never publish a release to test something — there are two local stages, and
using them is the expected loop:

| Stage | Command | Use it for |
| --- | --- | --- |
| Mock harness | `mise run dev` → <http://localhost:5050> | CSS, layout, markup. Instant, deterministic, no Home Assistant. Errors and card logging appear in a panel on the page. |
| Real Home Assistant | `mise run dev:ha` → <http://127.0.0.1:8124/lovelace/types> | End-to-end before a release: real frontend, real recorder, real theming. `dist/` is mounted as `/config/www`, so a rebuild plus browser reload is the whole loop. Login `dev` / `dev`, though `trusted_networks` auto-login usually makes that unnecessary. Its dashboard is a 58-card gallery of every documented option — use it to check a change against the whole surface, and extend it when you add or fix a feature. Each view has its own path (`types`, `aggregation`, `statistics`, `time`, `header`, `axes`, `extras`, `brush`, `integration`); an unknown one silently renders the first view instead of failing. |
| Tooltip metrics | `mise run tooltip:preview [git-ref...]` | Anything about rendered size — prints measured pixels and writes a screenshot. |

Notes that cost time to rediscover:

- The harness sets `cache: false` on every case. The card caches history in
  IndexedDB, which serves stale data after a reload, and in a headless browser
  profile that read never resolves — the card then sits at `Loading...` forever.
  Only the statistics path is unaffected, because the card disables its own cache
  there (`graphEntry.ts`).
- The dev container's dashboard uses `graph_span: 15min` because a fresh instance
  has no history; its synthetic sensors update every five seconds. Statistics
  cards need ~15 minutes of runtime before 5-minute buckets exist.
- `mise run dev:ha` is idempotent. Home Assistant unregisters its onboarding API
  once onboarding is done, so a 404 there means "already onboarded", not a
  failure. Use `mise run dev:ha:reset` for a clean instance: `docker compose down
  -v` does not reset anything, because the config directory is a bind mount.
- The dev instance's credentials (`dev` / `dev`) live in the `USER` constant of
  `dev/docker/bootstrap.mjs` and are created during onboarding. Changing them
  requires `dev:ha:reset` afterwards, because the account is already in
  `.storage`. They are acceptable only because the container is published on
  127.0.0.1 with synthetic data — never carry that pattern anywhere else.
- Headless Firefox can screenshot the harness but **not** the Home Assistant SPA
  — for stage 2, look at it in a real browser.
- `dev/docker/config` is a live Home Assistant config directory. Only
  `configuration.yaml` and `ui-lovelace.yaml` are tracked.
- `mise run dev:dashboard:check` validates every dev-dashboard card against the
  card's own checker and asserts that each heading has a review note. Add a card,
  add its note — the check fails otherwise. Two mistakes it caught are invisible
  in the YAML source and worth knowing: an unquoted flow-mapping title containing
  a comma becomes a second key, and `all_series_config.entity` does **not**
  satisfy validation because `strictCheck` runs before `all_series_config` is
  merged — `entity` is required on every `series` entry.

## Rules that are easy to get wrong

**`src/styles.ts` is a copy of ApexCharts' stylesheet and rots silently.** The
chart renders in the card's shadow root, where the library's own document-level
CSS never applies, so the card ships its own copy. When you bump ApexCharts,
re-sync it: `mise run css:diff tooltip` (or any selector substring, or nothing
for everything) reports what the bundled library has that the copy lacks, what
differs, and what only the copy has. Differences are not automatically bugs —
the Home Assistant theming overrides are deliberate — so it is a report, not a
gate. This exact drift already caused two user-visible bugs after the ApexCharts
6 upgrade: black tooltip text on dark themes, and a duplicated marker row per
series because v6 renders the marker as an inline `<svg>` while the copy still
painted v5's `::before` glyph.

**Never trust a green `npm run rollup` alone.** `rollup-plugin-typescript2`
caches type information in `.rpt2_cache` and, after a dependency bump, serves
the stale cache — producing a successful build for code that does not
type-check. This already caused a wrong conclusion once during this fork. Run
`mise run typecheck` (it is wired into `build`), and `mise run clean` when
touching dependencies.

**A green build is not a working card.** There is no rendering test, and jsdom
does no layout. Anything touching ApexCharts options or layout must be verified
in a browser; for tooltip metrics specifically, `mise run tooltip:preview
[git-ref...]` renders and measures it in headless Firefox and writes a
screenshot. Reasoning about padding arithmetic instead of measuring got the row
height wrong twice. If you cannot verify visually, say so explicitly instead of
claiming the change works. The manual checklist is in the README's Development
section.

**Locale keys are a contract.** `apex-layouts.ts` resolves locales as
`locales[hass.language]`, so every key in `src/locales.ts` must be a code Home
Assistant actually reports (ISO 639-1). `tests/locales.test.ts` enforces this.

**`dist/` is committed by the release workflow, not by you.** Do not commit
build output in a feature commit.

**Generated file.** If you change `src/types-config.ts`, regenerate
`src/types-config-ti.ts` with `npm run build:types-check`.

## Adopting an upstream PR

This is the most common task. The established pattern:

1. Fetch the diff:
   `curl -sL -H "Accept: application/vnd.github.v3.diff" https://api.github.com/repos/RomRider/apexcharts-card/pulls/<N>`
2. `git apply --check` first. If it conflicts with a fork change, port it by
   hand rather than forcing it.
3. **One PR per commit**, so a single adoption can be reverted without
   unpicking others.
4. Add a comment in the code naming the upstream PR (`Upstream PR RomRider#<N>`)
   and explaining *why* the change is needed — not what the code does.
5. Add a test if the fix is testable without a browser. Verify the test has
   teeth: revert the fix, watch it fail, restore it.
6. Note the adoption in the README table under *Differences from upstream*.
7. Reject a PR that removes a guard or changes semantics with no reproduction
   case, and write down why.

## Fixing a bug

**Reproduce before you fix.** A fix without a prior reproduction is a guess, and
this card makes guessing cheap and expensive: nothing throws, the chart simply
renders a wrong picture.

1. Build the failing case first. If the bug is testable without a browser, write
   the test and watch it fail; if it needs a browser, add a card to the dev
   gallery that exhibits it. Do not touch `src/` until you have seen the bug.
2. If the bug already reproduces somewhere, **show the developer where** before
   changing anything — exact dashboard path, exact card name, exact interaction
   (see *Reporting to the developer*). They may know a constraint you do not.
3. Fix it, then confirm the same case now passes.
4. Verify the test has teeth: revert the fix, watch it fail again, restore it. A
   test written after the code frequently asserts what the code happens to do.
   Mutating the fix is the only evidence that it would catch a regression.
5. State the root cause in terms of the mechanism, citing the code or library
   source you read. "Probably a timing issue" is not a diagnosis.

Two failures of this discipline already cost real time here, both recorded in the
notes: reasoning about tooltip padding instead of measuring it, and concluding a
y-axis fix did not work when the browser was serving a month-old cached bundle.

## Reporting to the developer

**Always address a card by its exact location and exact name.** "The forecast
card" is not actionable — there are several. Give the dashboard path, the view,
and the card's header title verbatim:

> <http://127.0.0.1:8124/lovelace/header> → view **Header & legend** → card
> **"#1031 (hide the first series)"**

For production dashboards, the same applies with the real path and, when the card
has no title, its position (`views[0].sections[1].cards[6]`).

**Close every piece of work with a summary** covering:

1. **What was done** — the change, and the commit it landed in.
2. **Before and after** — what the behaviour was, what it is now. Not the diff;
   the observable difference.
3. **How to see it.** For anything touching the UI or a card: the exact path and
   card name as above, the interaction to perform, and what correct looks like —
   including what is *expected but might look wrong*. Mention a required hard
   reload when `dist/` changed but the resource URL did not.
4. **For purely internal work** (refactor, tests, tooling), state the concrete
   outcome instead: what is now guaranteed, what regression class is now caught,
   what stays unverified. Never invent a visual check for a change that has none.

Anything you could not verify belongs in the summary too, named as such.



Conventional commits with a gitmoji:

```
type(scope): :gitmoji: short description

Why the change is needed, what it affects, and what remains unverified.
```

Types in use: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`.
The release workflow uses semantic-release, so the type prefix determines
versioning. Bodies explain rationale; the code shows the mechanics.

## Language

**Everything in this repository is written in English** — code, comments, commit
messages, documentation, dev-harness copy, dashboard review notes, test names,
script output. Upstream is an English project and this fork stays diffable
against it, so a German sentence in a comment or a card title is a defect even
when the surrounding logic is correct.

This applies to content that only ever appears locally, such as the dev
dashboard's card titles and series names: a reviewer or agent should not have to
switch languages when moving between `src/` and `dev/`.

Converse with the user in whatever language they use; write into the repository
in English.

## Documentation style

Document **why**, never what or how. The code is self-explanatory; the
non-obvious constraint that forced a solution is not. Concretely: a cast exists
because two libraries disagree on a type, a rule is disabled because rewriting
inherited code would break rebases, a guard exists because Home Assistant omits
data instead of nulling it. Write that down.

## Do not

- Bump TypeScript to 7.x: `typescript-eslint` 8 declares `typescript <6.1.0`,
  so the fork would become unlintable. 6.0.3 is the ceiling until
  typescript-eslint catches up.
- Force `@babel/core` 8: `@rollup/plugin-babel` 7 declares `^7.0.0` and the
  result is only an unmet peer dependency.
- Enable ApexCharts' premium features (`storyboard`, `link`, `ink`, `measure`,
  `contextMenu`, `perspectives`, `history`, `chart.type: unit`) in card
  defaults. They render an `APEXCHARTS` watermark without a paid license key.
- Add a runtime dependency without checking it is actually imported. Two dead
  ones (`tinycolor@0.0.1`, `array-flat-polyfill`) were already removed.
- Rename or restructure upstream files.
