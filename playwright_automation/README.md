# Playwright component tests

**Verdict: Go with limits.**

Local Playwright against Storybook is the V1 path for component UI tests. Switch and Logo are green on Chromium. PRs can **scope** runs and **plan** create/update/delete via graph + issue + master sheet, with QA `READY` before mechanical apply.

Fresh local run, 10 Nov 2026, Chromium, one worker, Storybook started by Playwright: **48 passed, 0 failed, 2.1 minutes.**

## What the reviewer asked, and what the spikes showed

| Question | Answer from the hands-on work |
| --- | --- |
| Was a method recommended before anyone ran it? | Research looked at Jest, bare axe, the QA sheet, Storybook `play` functions, and Chromatic / Argos / Playwright. The recommendation below follows the runs, not the research note. |
| What was tried, in order? | Jest and `a11y-check.yml` stay (structure and default-state axe). Storybook `play` was dropped so public docs stay free of test code. Playwright on the Storybook iframe is what went green. An always-on generator (RAG, AST scaffold, judge, circuit breaker) was added later and never run against a real PR. That layer is removed. |
| What does each option cost, and what does it cover? | See the cost table. This package is the $0 row. |
| Which AI, and what does it cost? | A QA comment `ready for QA` starts Cursor CLI in GitHub Actions on the QA account, model Composer 2.5. Tokens are spent only for that comment. There is no always-on generator and no laptop run of that sync. |
| What changes day to day? | Run the commands below on the component you touched. Jest (`npm test`) and `a11y-check.yml` stay as they are. Pixel baselines are not in this package. |

Public `*.stories.ts` files stay documentation. Tests live here and open the iframe URL (`/iframe.html?id=...`).

## Cost and coverage

| Option | Cost | Covers | Does not cover |
| --- | --- | --- | --- |
| Jest `newSpecPage` (already in `merge-gate.yml`) | CI minutes already paid | Markup and prop render | Click, keyboard, real events |
| `a11y-check.yml` | CI minutes already paid | Axe on the default render | Open, focused, or expanded states |
| **This package** | $0 license. GitHub Actions minutes for `.github/workflows/playwright.yml` | Browser behavior, keyboard, events, axe on a real state, token color, SVG geometry | Hosted visual review, pixel baselines |
| Argos | Free tier 5k screenshots/month, then about $100/month at 35k | Screenshot review UI | Not adopted. Revisit only if local screenshot review time exceeds that fee |
| Chromatic | Free tier 5k snapshots/month (Chrome only), then about $179/month at 35k | Storybook-native review, TurboSnap | Not adopted. Same revisit rule. Chrome-only on the free tier |

Lane B (screenshots) is not started. If it starts, capture baselines on Ubuntu CI only, keep the cohort small, and keep it advisory. Do not promote baselines from a laptop.

## Limits (why this is not a full Go)

- Creating, updating, and deleting cases happens in GitHub Actions when QA comments `ready for QA`. Cursor CLI uses the QA account and Composer 2.5. The workflow then runs the graph-scoped suite and blocks merge until status `qa-playwright` is green. See [`.github/workflows/qa-playwright-cursor.yml`](../.github/workflows/qa-playwright-cursor.yml).
- Chromium is the pull-request check. Firefox and WebKit run on the nightly schedule and on a manual workflow run. Turn the check into a required status in branch protection after it is green on `main`.
- `a11y-check.yml` stays until every component has a real-state axe test here. Axe failures are not skipped.
- One automatic retry in CI, zero locally. One worker. Logo accent fill flaked at two workers.
- Figma pixel comparison stays manual.
- Repo path must not contain spaces. Stencil's watch step failed under a spaced path during the Logo spike.

## PR-driven flow (graph + issue + master sheet)

```
git diff / PR files
        ↓
  agent:scope  ← component-graph.json (changed tag, reverseImpact, compose children)
        ↓
  agent:plan   ← PR body/comments, linked issue, optional master-sheet CSV
        ↓
specs/<slug>.md  (DRAFT → QA → READY)
        ↓
  Cursor skill implements `add` rows; agent:apply --write for `remove` stubs
        ↓
  agent:audit / test:playwright:scoped
```

| Command | What it does |
| --- | --- |
| `npm run agent:scope` | Writes `.agent/scope.json`; lists runnable slugs and every changed component that has no test folder |
| `npm run agent:plan` | Writes `specs/<slug>.md` per changed component. Existing tests become `keep` rows when the master sheet is absent |
| `npm run agent:audit -- modus-wc-switch` | Plan vs existing `@master` tests |
| `npm run agent:apply -- --write modus-wc-switch` | Deletes `remove` ids; adds `test.skip` stubs for `add` |
| `npm run agent:qa` | scope → plan → scoped run (local CI-equivalent) |
| `npm run test:playwright:scoped` | Playwright only for slugs in scope |

Export the master sheet to `playwright_automation/.agent/master-sheet.csv` or set `MASTER_SHEET_CSV`. See [`.cursor/GOOGLE-MCP-SETUP.md`](../.cursor/GOOGLE-MCP-SETUP.md).

Set `PLAYWRIGHT_SCOPE_PARENTS=1` to include up to three `reverseImpact` parent folders in the scoped run (when specs exist).

## Day to day

From the repo root, with Node 20+:

```powershell
npm run test:playwright
```

That runs Chromium, one worker, tests tagged `@master`. If port 6006 is free, Playwright starts `npm run storybook:start` (Stencil watch plus Storybook). First start can take several minutes.

Storybook already running:

```powershell
$env:PLAYWRIGHT_SKIP_WEBSERVER = '1'
npm run test:playwright -- tests/components/switch
```

Chromium, Firefox, and WebKit:

```powershell
npm run test:playwright:browsers
```

Hosted Storybook (no local server):

```powershell
$env:STORYBOOK_URL = 'https://modus-web-components-v2.trimble.com'
npm run test:playwright -- tests/components/logo
```

HTML report: `npm run report:html`.

## CI

`.github/workflows/playwright.yml` checks out the branch, runs `npm ci` and `npm run build:ci`, then Playwright starts `storybook dev` on port 6006. It does not deploy, and it does not write tests.

`.github/workflows/qa-playwright-cursor.yml` is the run that writes tests. It starts only when an allowlisted QA user comments `ready for QA`. Cursor CLI (`CURSOR_API_KEY` from the QA account, `--model composer-2.5`) reads the component graph, the pull request, the linked issue, and the master sheet CSV, then creates, updates, or deletes cases. The workflow pushes those test files, runs the graph-scoped Chromium suite (changed component plus up to three `reverseImpact` parents), and comments `## QA Playwright PASSED` or `## QA Playwright FAILED` with the suite, test name, assertion error, and a link to the HTML report. It does not merge. Require the `qa-playwright` status on `main`. A new commit needs another `ready for QA` comment.

Set Actions variable `QA_GITHUB_LOGINS` and secret `CURSOR_API_KEY`. Optional secret `MASTER_SHEET_CSV` is the sheet export. The prompt file on the default branch is what the CLI follows.

| Trigger | Browsers |
| --- | --- |
| Pull request to `main` | Chromium |
| Nightly 02:30 UTC, and **Run workflow** | Chromium, Firefox, WebKit |

Each browser is its own job. The HTML report and failure traces upload as `playwright-report-<browser>` and are kept for 7 days. `merge-gate.yml`, `a11y-check.yml`, and the Storybook preview deploy stay as they are. Storybook preview is the deploy path; this workflow only tests.

Install browsers once: `npx --prefix playwright_automation playwright install chromium` (add `firefox webkit` for the matrix).

A new component copies `pages/<name>.page.ts` and the spec files under `tests/components/<name>/`: stories, props, a11y, css, shadow-dom, show-code, performance. Tag cases `@master`. Run Chromium. Fix the product or delete the case. Do not leave a red test in the suite.

`name` on Logo is a Storybook select. The iframe often ignores that URL arg. The page object sets the property after navigation. That is why `syncName` exists.

## What the suite checks

Switch: default and shadow-host stories, docs page, label/`input-id` association, checked / unchecked / mixed, `inputChange` on click, `inputFocus` and `inputBlur`, Space, axe on enabled and disabled, focus outline, disabled opacity, `--rounded-badge` read from the host (not the document root) on six themes, shadow-host theme and click. Performance: default story ready within 8s, and a `value` change rendered within 1s.

Logo: default, custom size classes, shadow host, docs page, `name` / `emblem` / `alt`, Trimble emblem `0 0 32 32` versus wordmark `0 0 106 32`, Connect emblem `0 0 32 32` versus wordmark `0 0 67 30` (the check that failed when the emblem SVG was swapped), accent fill equals `--modus-wc-color-primary` on six themes (the check that failed when dark themes used the error color), axe, shadow theme. Performance: default story ready within 8s, and a `name` or `emblem` change rendered within 1s.

## Layout

```text
playwright_automation/
  playwright.config.ts
  assertions/          css tokens, host events, svg viewBox, performance budgets
  fixtures/            iframe URL, themes, axe, show-code
  pages/               one page object per component
  tests/components/    stories, props, a11y, css, shadow-dom, show-code, performance
```

Shared navigation and event listeners stay in fixtures and assertions. A listener is armed before the click or key. Starting both together drops the event and the test hangs until timeout.

## QA Master Sheet (Google)

Manual cases live in the [QA Master Sheet](https://docs.google.com/spreadsheets/d/1MrnDnYSQWsIj45IMZK_1R0caCjHyu4PyO-P-3m06xjI/edit?gid=935899082). The QA workflow reads a CSV export from the `MASTER_SHEET_CSV` secret. Locally, put the same export at `playwright_automation/.agent/master-sheet.csv` before `npm run agent:plan`.

To pull rows from Cursor, set up Google MCP: [`.cursor/GOOGLE-MCP-SETUP.md`](../.cursor/GOOGLE-MCP-SETUP.md). After OAuth, use **google-drive** → `sheets_read_range` on spreadsheet `1MrnDnYSQWsIj45IMZK_1R0caCjHyu4PyO-P-3m06xjI`.

## Out of this package

Jest merge gate, bare `a11y-check.yml`, public Storybook stories, screenshot baselines, and Angular / React / Vue wrapper smoke.
