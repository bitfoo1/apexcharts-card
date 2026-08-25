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
| `test/` | **Not tests.** A Home Assistant dev instance config (`configuration.yaml`, `ui-lovelace.yaml`) inherited from upstream. |
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

## Rules that are easy to get wrong

**Never trust a green `npm run rollup` alone.** `rollup-plugin-typescript2`
caches type information in `.rpt2_cache` and, after a dependency bump, serves
the stale cache — producing a successful build for code that does not
type-check. This already caused a wrong conclusion once during this fork. Run
`mise run typecheck` (it is wired into `build`), and `mise run clean` when
touching dependencies.

**A green build is not a working card.** There is no rendering test. Anything
touching ApexCharts options, layout, or the Home Assistant connection must be
verified in a browser. If you cannot do that, say so explicitly instead of
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

## Commit conventions

Conventional commits with a gitmoji:

```
type(scope): :gitmoji: short description

Why the change is needed, what it affects, and what remains unverified.
```

Types in use: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`.
The release workflow uses semantic-release, so the type prefix determines
versioning. Bodies explain rationale; the code shows the mechanics.

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
