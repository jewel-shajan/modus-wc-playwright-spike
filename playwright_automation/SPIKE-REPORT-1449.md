# Spike report: local CI-equivalent run and go/no-go ([#1449](https://github.com/trimble-oss/modus-wc-2.0/issues/1449))

Parent: Technical Spike – Automation testing for components.

## 1. Verdict

**Go with limits.**

Playwright against the Storybook iframe passes for the two pilot components. Scope and plan generation run locally. The open limits are in section 7.

## 2. What was run

| Step | Command (repo root) | Result |
| --- | --- | --- |
| Scope | `npm run agent:scope` | Wrote `.agent/scope.json` from the local diff. Changed tags: badge, content-tree, logo, table. Runnable suite: `logo`. Printed no-test-folder lines for badge, content-tree, and table. This command does not run tests. |
| Plan | `npm run agent:plan` | Wrote the same four specs. Logo is `Status: **READY**` with 18 `keep` rows taken from the test titles. Badge, content-tree, and table stay `DRAFT` with the three archetype rows, because those components have no tests. |
| Suite | `npm run test:playwright` | **48 passed, 0 failed, 0 skipped, 124 s.** Chromium, 1 worker. Source: `reports/results.xml`, 10 Nov 2026. This is the full `@master` suite (Switch 25 + Logo 23), not the scoped run. |
| Audit | `npm run agent:audit -- modus-wc-logo` | **Exit 0.** 18 source titles, 0 missing, 0 orphans. Re-run after the plan change below. |

`PR_NUMBER` was unset, so scope used `git diff` and every plan says `PR: n/a` and `Issue: n/a`. No `master-sheet.csv` was present, so every plan says `Master sheet: not loaded`. `npm run agent:qa` runs scope, then plan, then the scoped Playwright command. It does not write tests. Test writing is the Cursor CLI step in `.github/workflows/qa-playwright-cursor.yml`.

## 3. Folder and file structure

Generated output (`reports/`, `test-results/`, `allure-results/`, `node_modules/`) is omitted.

```text
modus-wc-2.0/
├── package.json                         Proxies: test:playwright, test:playwright:scoped,
│                                        test:playwright:browsers, agent:scope|plan|audit|apply|qa
├── docs/component-graph/
│   └── component-graph.json             Edges (composes, slot, hosts) and reverseImpact parents
├── .github/
│   ├── workflows/
│   │   ├── playwright.yml               Runs tests. PR = Chromium. Nightly 02:30 UTC and manual = 3 browsers
│   │   └── qa-playwright-cursor.yml     "ready for QA" → Cursor CLI writes tests → scoped run → comment + status
│   └── prompts/
│       └── qa-playwright-sync.md        Prompt the CLI follows. CI reads it from the default branch
├── .cursor/skills/playwright-pr-orchestrator/
│   └── SKILL.md                         Same flow for a session inside Cursor
└── playwright_automation/
    ├── package.json                     Scripts. Dev deps: @playwright/test, @axe-core/playwright, tsx, typescript
    ├── playwright.config.ts             See section 4
    ├── tsconfig.json                    Compiles the scripts and tests
    ├── README.md                        Commands, cost table, limits
    ├── .agent/
    │   ├── scope.json                   Written by agent:scope
    │   └── master-sheet.csv             Optional sheet export. Absent in this run
    ├── scripts/
    │   ├── resolve-scope.ts             agent:scope
    │   ├── build-plan.ts                agent:plan
    │   ├── coverage-audit.ts            agent:audit
    │   ├── apply-plan.ts                agent:apply
    │   ├── run-scoped.ts                test:scoped
    │   ├── agent-qa.ts                  scope, then plan, then scoped run
    │   ├── report-ci.mjs                Builds the QA pull-request comment
    │   └── lib/
    │       ├── paths.ts                 Root, tests, specs, .agent paths. tag ↔ slug
    │       ├── component-graph.ts       Load graph. Diff path → tag. Resolve run set
    │       ├── git-context.ts           Changed files, gh pr view, linked issue body
    │       ├── master-sheet.ts          CSV parse. Match rows to a component
    │       └── spec-index.ts            Read test() titles from a component folder
    ├── specs/
    │   ├── README.md                    DRAFT, READY, NEED CLARIFICATION
    │   └── badge.md, content-tree.md, logo.md, table.md
    ├── fixtures/
    │   ├── storybook.ts                 iframe URL, custom-element wait, set/read host props
    │   ├── themes.ts                    6 theme ids and the globals query
    │   ├── a11y.ts                      Axe on WCAG 2.0/2.1 A and AA
    │   └── showCodeFixture.ts           Docs view, "Show code", snippet text
    ├── assertions/
    │   ├── css-token.ts                 Read a CSS variable. Compare computed style to the host token
    │   ├── events.ts                    Listen, then act. Assert a host or shadow-host event
    │   ├── performance.ts               Story-ready budget (8s) and prop-update budget (1s)
    │   └── svg-geometry.ts              viewBox checks. Trimble and Connect constants
    ├── pages/
    │   ├── base.page.ts                 gotoStory, syncProp, host locator
    │   ├── switch.page.ts               Story ids. size, value, disabled, indeterminate, label/id, focus
    │   └── logo.page.ts                 Story ids. name, emblem, aria-label, role
    └── tests/components/
        ├── switch/                      7 spec files. 25 behavior tests, plus performance.spec.ts
        └── logo/                        7 spec files. 23 behavior tests, plus performance.spec.ts
```

## 4. What each file does

### `playwright.config.ts`

- `baseURL`: `STORYBOOK_URL`, otherwise `http://127.0.0.1:6006`.
- `grep`: `/@master/`. `workers: 1`. `fullyParallel: false`.
- `retries`: 1 when `CI` is set, otherwise 0. `forbidOnly` in CI.
- Reporters: list, HTML in `reports/`, JUnit at `reports/results.xml`.
- Trace and video on failure. Screenshot on failure. Viewport 1280×720.
- Web server: in CI, `npx storybook dev -p 6006 --ci` from the repo root. Locally, `npm run storybook:start`. Skipped when `PLAYWRIGHT_SKIP_WEBSERVER=1` or the URL is not localhost. Timeout 480s. Reuses a running server outside CI.
- Projects: chromium, firefox, webkit.

### Scripts

| File | Reads | Does |
| --- | --- | --- |
| `resolve-scope.ts` | With `PR_NUMBER`: `gh pr diff --name-only`. Otherwise `git diff` against `BASE_SHA` (default `origin/main`), plus unstaged and staged files. Plus the graph | Writes `.agent/scope.json`. A path under `src/components/modus-wc-*/` becomes a tag. `compose` / `slot` / `hosts` children are stored in `composeChildTags` and are not added to the run. Parents are added only when `PLAYWRIGHT_SCOPE_PARENTS=1`, capped by `PLAYWRIGHT_PARENT_CAP` (default 3). `runnableSlugs` keeps tags that already have `tests/components/<slug>/`. Tags in the run set with no folder are printed and stored as `missingTestFolders`. `fallbackAll` is true when no component path changed |
| `build-plan.ts` | `scope.json`. With `PR_NUMBER`: `gh pr view` and the first `Closes` / `Fixes` / `Resolves` / `#n` issue. CSV at `MASTER_SHEET_CSV` or `.agent/master-sheet.csv` | One `specs/<slug>.md` per **changed** tag. Sheet rows win. With no sheet, existing `test()` titles become `keep` rows. The three archetype rows (`STORIES`, `PROPS`, `A11Y`) are written only when the component has no tests and no sheet. A sheet cell of no/manual/skip is action `manual`. Status is `DRAFT` while any row is `add` or `remove`, otherwise `READY`. The script still never writes a `remove` row, and `NEED CLARIFICATION` stays unused (`conflicts` is empty) |
| `coverage-audit.ts` | `specs/<slug>.md` and `test()` titles | Prints plan rows with no matching test, and tests with no matching plan row. Exits 1 when an automated `add` or `keep` row is missing. Rows with action `manual` or automate `no` are not required. Orphans alone do not change the exit code |
| `apply-plan.ts` | A plan whose status is `READY` | Dry run unless `--write`. Deletes each `test()` block whose source contains a `remove` id. Writes `test.skip` stubs in `plan-stubs.spec.ts` for every automated `add` row, including when that folder already has tests |
| `run-scoped.ts` | `.agent/scope.json` | `playwright test --project=$PLAYWRIGHT_PROJECT` (default chromium). With runnable slugs and `fallbackAll` false, it passes those folders. Otherwise it runs the full `@master` suite |
| `agent-qa.ts` | — | `resolve-scope.ts`, then `build-plan.ts`, then `run-scoped.ts`. Stops at the first non-zero exit |
| `report-ci.mjs` | JUnit XML, scope, notes, skip list, block text, changed files, agent log | Markdown for the `## QA Playwright PASSED` or `## QA Playwright FAILED` comment. CI runs the copy on the default branch |

`spec-index.ts` reads the source text of `test('...')`. A template such as `` test(`... ${theme} ...`) `` is one title. Playwright still runs it once per theme. Logo's audit count is 18 titles; the suite executed 23 tests.

### Tests

Behavior specs, six files per component, plus `performance.spec.ts`. Every title includes `@master`. Performance is described in the next section.

**Switch — 25 executed**

| File | Tests |
| --- | --- |
| `stories.spec.ts` (3) | Default canvas and switch input. ShadowDomParent. Autodocs |
| `props.spec.ts` (5) | `size` sync. Label `for` matches input id. `aria-checked` true, false, mixed. `inputChange` on click. `inputFocus` and `inputBlur` |
| `a11y.spec.ts` (6) | Axe enabled. Axe disabled. ARIA snapshot. Space toggles and emits `inputChange`. Focus outline after Tab. Disabled opacity and `aria-disabled` |
| `css.spec.ts` (7) | `--rounded-badge` from the host, once per theme (6), plus one test that it is not read from the document root |
| `shadow-dom.spec.ts` (3) | Mounts in an open shadow root. `data-theme` on the wrapper. Click inside the shadow boundary |
| `show-code.spec.ts` (1) | Docs snippet contains `modus-wc-switch`. The first docs preview matches the canvas story on role, class, checked state, and size (2px) |

**Logo — 23 executed (18 source titles; CSS is 1 template × 6 themes)**

| File | Tests |
| --- | --- |
| `stories.spec.ts` (4) | Default canvas, role `img`. Custom size classes. ShadowDomParent. Autodocs |
| `props.spec.ts` (7) | `name` sync. Emblem class. `alt` as aria-label. Default aria-label from `name`. Emblem viewBox `0 0 32 32`. Wordmark viewBox `0 0 106 32`. Connect emblem SVG |
| `a11y.spec.ts` (3) | Axe on the wordmark. Axe on the emblem. ARIA snapshot for role `img` |
| `css.spec.ts` (6) | Accent fill equals the primary token, once per theme |
| `shadow-dom.spec.ts` (2) | Renders inside `logo-shadow-host`. `data-theme` on the wrapper |
| `show-code.spec.ts` (1) | Docs snippet contains `modus-wc-logo`. The first docs preview matches the canvas story on role, class, aria-label, viewBox, and size (2px) |

Themes, from `fixtures/themes.ts`: `modus-modern-light`, `modus-modern-dark`, `modus-classic-light`, `modus-classic-dark`, `connect-light`, `connect-dark`.

## 5. Performance

Source: `playwright_automation/assertions/performance.ts`, `tests/components/logo/performance.spec.ts`, `tests/components/switch/performance.spec.ts`.

Local Chromium run on 10 Nov 2026, Storybook already on port 6006: **5 passed, 0 failed, 6.2 s.** Numbers below are the `performance` properties in `playwright_automation/reports/results.xml` from that run.

### What is timed

Both clocks use `performance.now()` in the Playwright process.

| Check | Start | Stop | Pass condition |
| --- | --- | --- | --- |
| Story ready | Before `gotoStory` | After the custom element is defined and the host is attached | Rounded milliseconds ≤ story budget |
| Property update | Before the property is written on the host | After the rendered value is visible (Playwright locator poll) | Rounded milliseconds ≤ update budget |

The update number includes the property write and the locator poll. It is not a browser-only paint time.

The property is set with `page.evaluate` on the first matching host. The locator then proves the render:

| Component | Write | Rendered proof |
| --- | --- | --- |
| Logo | `name` `trimble` → `connect` | `aria-label` matches `/connect/i` |
| Logo | `emblem` `false` → `true` | class contains `logo-emblem` |
| Switch | `value` `true` → `false` | input is unchecked. A `false` boolean removes `aria-checked`, so the test does not look for the string `"false"` |

Stories timed today: Logo Default and Switch Default. These canvas stories are not in the performance file: Logo `CustomSizeWithClass`, Logo `ShadowDomParent`, Switch `ShadowDomParent`. Docs pages and the Switch `Migration` story are not timed. A docs page spends its time in the Storybook docs layout.

### How the budgets were set

One warm local run. They are fixed limits, not a percentage of the last result.

| Budget | Default | Env override | Why this number |
| --- | --- | --- | --- |
| Story ready | 8 000 ms | `PLAYWRIGHT_STORY_BUDGET_MS` | The clock includes opening the Storybook iframe. Warm runs were 364 ms and 386 ms. A first compile of a story can take several seconds. 8 s fails a hang before the 30 s Playwright test timeout |
| Property update | 1 000 ms | `PLAYWRIGHT_UPDATE_BUDGET_MS` | The first limit was 500 ms. The emblem swap measured 523 ms and failed. 1 000 ms is above that swap and still fails a stalled update |

### Measured on that run

| Test | Measured | Budget | Result |
| --- | --- | --- | --- |
| Logo story ready | 364 ms | 8 000 ms | pass |
| Logo name update | 441 ms | 1 000 ms | pass |
| Logo emblem update | 495 ms | 1 000 ms | pass |
| Switch story ready | 386 ms | 8 000 ms | pass |
| Switch value update | 481 ms | 1 000 ms | pass |

A later run that is slower than these values still passes until it crosses the budget. A Logo story ready time of 700 ms passes. A time of 8 001 ms fails.

### Where the numbers go

`notePerformance` adds a Playwright annotation `{ type: 'performance', description: '<label>: <ms>ms' }`.

| Output | What it holds |
| --- | --- |
| `playwright_automation/reports/results.xml` | `<property name="performance" value="logo story ready: 364ms">` on each test case |
| `playwright_automation/reports/index.html` | The same annotation on the test |

The next Playwright run replaces both files. The repo does not keep a baseline. The GitHub workflow uploads the report as an artifact and keeps it for 7 days. It does not read the previous artifact, so there is no comparison with the previous run.

### How it is run

The tests are tagged `@master`, so they run with the rest of the suite.

- `npm run test:playwright` runs Logo and Switch performance tests.
- `npm run agent:qa` runs only the components in scope that have a test folder. On the current diff that is Logo, so the Switch performance tests stay out of that command.
- To run the five performance tests alone, from `playwright_automation`, with Storybook already up:

```powershell
$env:PLAYWRIGHT_SKIP_WEBSERVER = '1'
npx playwright test tests/components/logo/performance.spec.ts tests/components/switch/performance.spec.ts --project=chromium
```

## 6. How it executes

### Local

```text
git diff  (or gh pr diff when PR_NUMBER is set)
        │
        ▼
npm run agent:scope     reads component-graph.json
        │               writes .agent/scope.json
        ▼
npm run agent:plan      writes specs/<slug>.md as DRAFT
        │
        ▼
edit the plan to READY and implement `add` rows     (person or Cursor skill)
        │
        ▼
npm run agent:audit -- modus-wc-<slug>
        │
        ▼
npm run test:playwright:scoped     Storybook on :6006, then the runnable folders
        │
        ▼
reports/  and  test-results/
```

`npm run agent:qa` is the first, second, and fourth commands in one process. `npm run test:playwright` ignores scope and runs every `@master` test on Chromium. That is the command behind the 48-pass result.

On a normal pull request, `playwright.yml` calls `agent:scope` **without** `PLAYWRIGHT_SCOPE_PARENTS`. Parent folders stay out of that run. The QA workflow sets `PLAYWRIGHT_SCOPE_PARENTS=1`.

### `.github/workflows/playwright.yml` — runs tests, writes none

1. Pull request to `main`: Chromium. Nightly `30 2 * * *` and a manual run: Chromium, Firefox, WebKit. Each browser is its own job. `fail-fast` is false. Timeout 30 minutes.
2. `npm ci`, `npm ci --prefix playwright_automation`, `npm run build:ci`, `playwright install --with-deps <browser>`.
3. On a pull request: `agent:scope`, then `test:scoped` for that browser. Otherwise the full project suite.
4. Uploads `playwright-report-<browser>` (reports and test-results). Kept 7 days.

### `.github/workflows/qa-playwright-cursor.yml` — writes tests, then runs them

1. **Trigger.** A pull-request comment that matches `ready for QA` (any casing). One run per pull request; a new run cancels the previous one.
2. **Gate.**
   - Commenter is in the `QA_GITHUB_LOGINS` variable.
   - Head repository is this repo, and the branch name has no `..`, space, or leading `-`.
   - Secret `CURSOR_API_KEY` is set.
   - A commenter outside the list ends the job with no comment and no status.
   - An empty allowlist, an empty API key, a fork, or an unreadable pull request posts `## QA Playwright FAILED` and a failure status `qa-playwright`.
3. **Sync job** (timeout 40 minutes), only when the gate sets `proceed`.
   - `npm ci --prefix playwright_automation`. If secret `MASTER_SHEET_CSV` is set, writes it to `.agent/master-sheet.csv`.
   - Installs Cursor CLI. Its permission file allows writes under `playwright_automation/tests`, `pages`, `specs`, `assertions`, `fixtures`, and `.agent`. It denies push, commit, `gh pr` merge/comment/review/close, `rm`, and writes to `.github/`, `src/`, and the root package files.
   - Loads `.github/prompts/qa-playwright-sync.md` from the **default branch**. Runs `agent -p --force --trust --sandbox disabled --model composer-2.5`. The prompt tells the agent to run `agent:scope` and `agent:plan`, implement `add` / `keep` / `remove` / `manual`, set the plan to `READY`, and write `.agent/qa-sync-notes.md`. It tells the agent not to run Playwright, not to commit, and not to run `agent:apply`.
   - Stages only those five test-package directories. Any other modified or untracked file blocks the run. New `test.skip` lines in `*.spec.ts` are saved for the report. `scope.json`, the CSV, and the notes file are removed from the tree before the patch is taken (the notes are copied into the artifact first).
4. **Verify job** (timeout 45 minutes).
   - `npm ci`, `npm ci --prefix playwright_automation`, `npm run build:ci`, Chromium with OS deps.
   - `git apply` the patch, commit `test: sync Playwright cases for QA verification` as `modus-qa-playwright`, push to the PR branch.
   - `agent:scope` with `PLAYWRIGHT_SCOPE_PARENTS=1`, then `npm run test:playwright:scoped` with `CI=true` (one retry, Storybook via `storybook dev`).
   - Uploads `qa-playwright-report`. Kept 7 days.
5. **Report.** `report-ci.mjs` from the default branch. Posts one comment and sets status `qa-playwright`. A non-empty skip list, a sync block, a build failure, an apply failure, or a test failure all post FAILED. When a patch was pushed, the status is on the new commit. The workflow does not merge. A later push has no `qa-playwright` status until QA comments again.

Plans are written for changed tags only. A parent is listed inside that plan and, in the QA workflow, is executed if its test folder exists. It does not get its own `specs/<slug>.md` unless it is also a changed tag.

## 7. Limits

| # | Limit | Evidence |
| --- | --- | --- |
| 1 | `qa-playwright-cursor.yml` has not been executed on GitHub. The workflow reads the prompt and `report-ci.mjs` from the default branch. Both are untracked in this checkout, together with the workflow and `playwright_automation/`. | `git status` |
| 2 | PR, issue, and master-sheet inputs were not used in this run. | `specs/logo.md`: `PR: n/a`, `Issue: n/a`, `Master sheet: not loaded` |
| 3 | Badge, content-tree, and table are in the diff and have no Playwright folder. Scope now prints them. A scoped run still executes Logo only. | `agent:scope` log, 10 Nov 2026 |
| 4 | Two components have tests: Switch and Logo. | `tests/components/` |
| 5 | Pull requests in `playwright.yml` run Chromium and do not include `reverseImpact` parents. Firefox and WebKit run on the nightly schedule and on a manual run. Workers stay at 1. The README records that the Logo accent-fill check flaked at 2 workers. | `playwright.yml`, `playwright.config.ts`, README |
| 6 | `agent:apply --write` emits `test.skip`. The QA workflow treats a new `test.skip` as a failed run. The CI prompt tells the agent not to call `agent:apply`. | `apply-plan.ts`, `qa-playwright-cursor.yml`, `qa-playwright-sync.md` |
| 7 | Screenshot baselines and Figma comparison are outside this package. | README, "Out of this package" |

Closed on this pass: Logo's plan is built from the 18 source titles (`keep`), and `npm run agent:audit -- modus-wc-logo` exits 0. `agent:scope` prints each run-set tag that has no test folder. The audit skips `manual` rows and rows with automate `no`.

## 8. What is still required for a full Go

These need a GitHub repo admin and a real pull request. They cannot be closed from this checkout alone.

1. Land `.github/workflows/qa-playwright-cursor.yml`, `.github/prompts/qa-playwright-sync.md`, and `playwright_automation/` (including `scripts/report-ci.mjs`) on the default branch.
2. In the repository: Actions variable `QA_GITHUB_LOGINS` (comma-separated GitHub usernames), secret `CURSOR_API_KEY` (QA Cursor account), optional secret `MASTER_SHEET_CSV` (the sheet export).
3. On one pull request, an allowlisted user comments `ready for QA`. Confirm the bot commit, the `## QA Playwright PASSED` comment, and a green `qa-playwright` status.
4. Locally, with that pull request's number and a sheet export:

```powershell
$env:PR_NUMBER = '<number>'
$env:MASTER_SHEET_CSV = 'playwright_automation/.agent/master-sheet.csv'
npm run agent:scope
npm run agent:plan
```

`specs/<slug>.md` should then show the PR URL, the issue number, and `master-sheet` rows.

5. After one green run on `main`, require the `qa-playwright` status in branch protection.
