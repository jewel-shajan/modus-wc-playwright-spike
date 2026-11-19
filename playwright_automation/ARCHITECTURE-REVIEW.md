# Architecture Review: Playwright Automation for Modus Web Components

Reviewer stance: Senior SDET. Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md), which describes the system as built.

**Evidence base.** The code at HEAD `7c82097`, a local baseline run (60 passed, chromium, serial, about 1.7 min), a 4-worker run, a probe of how Storybook handles URL args, `tsc --noEmit`, and the latest PR CI run (`44533696367`).
**Not verified:** anything marked *unverified*. Code snippets below were written for this review and have **not** been run against the repo; treat them as starting points and run the suite after applying.

---

## 1. Verdict

The foundation is sound. The Page Object layer is small and consistent, locators mostly pierce shadow DOM correctly, the suite is stable (no flakes in the baseline), and the PR-scoped pipeline is a real strength. The risks are about **how much a green check can be trusted** and **how fast and honest the signal is**:

1. Some tests cannot fail, or pin a likely product defect as expected behaviour.
2. The suite is forced serial by wall-clock performance tests that also gate merges.
3. A PR can go green while changed components have no tests.
4. Test code is not type-checked, and the plan tooling has correctness bugs.

Nothing here needs a rewrite. Most fixes are small and local.

### What is already good (keep)

| Practice | Where |
| --- | --- |
| Page Objects with one abstract base, story IDs as constants | `pages/` |
| Web-first assertions and `expect.poll` rather than fixed sleeps | specs |
| Open-shadow-DOM piercing through plain CSS locators | `pages/` |
| ARIA snapshot tests for `switch` and `img` roles | `switch/a11y.spec.ts`, `logo/a11y.spec.ts` |
| `forbidOnly`, retries only in CI, trace/screenshot/video on failure | `playwright.config.ts` |
| Diff guard and approval gate around LLM-written tests | `qa-playwright-cursor.yml`, `qa-approval.yml` |
| Scoped runs driven by a component dependency graph | `scripts/` |
| Generated `.agent/` files are gitignored | `.gitignore` |

---

## 2. Findings summary

| ID | Severity | Finding |
| --- | --- | --- |
| H1 | High | Enum / select URL args are ignored; `syncProp` carries the tests; the arg pipeline is untested |
| H2 | High | Wall-clock performance tests gate merges and force `workers: 1` |
| H3 | High | Tests pin `aria-checked=""` / `aria-disabled=""`; event tests never check the payload |
| H4 | High | Green check hides components with no tests; scope ignores shared files |
| H5 | High | Test code is not type-checked (6 `tsc` errors, no CI step) |
| H6 | High | `apply-plan` can corrupt spec files; plan statuses and issue linking are unreliable |
| M1 | Medium | Readiness is `customElements.get`, not Storybook or Stencil readiness |
| M2 | Medium | No `test.extend` fixtures; no console / page-error guard |
| M3 | Medium | `events.ts` leaks listeners, shares a global array, and drops `detail` |
| M4 | Medium | axe: no `wcag22aa`, default theme only, results not attached |
| M5 | Medium | Locators lean on CSS classes and `.last()`; manual `shadowRoot` code is unnecessary |
| M6 | Medium | Storybook dev server in CI; `webServer.url` hard-coded |
| M7 | Medium | `describe.configure({ mode: 'serial' })` in css specs; hard-coded `'32px'` |
| M8 | Medium | Story IDs hard-coded in specs; no check that they exist in Storybook |
| M9 | Medium | Tagging by title string; untagged tests silently never run |
| M10 | Medium | `run-scoped` adds `--project` twice |
| M11 | Medium | Weak or misleading tests (Tab focus, Navbar props, "interactive state") |
| M12 | Medium | Write tokens in the job that runs LLM-authored code |
| L1 | Low | Dead and redundant helpers (`expectComputedMatchesHostToken`, `ensureProp`, duplicated `gotoShadowDomParent`) |
| L2 | Low | `execSync` with string interpolation |
| L3 | Low | `expandShowCodeIfCollapsed` always clicks |
| L4 | Low | Documentation drift |

---

## 3. High-severity findings and refinements

### H1. URL args for enum / select props are ignored

**Evidence.** A probe of the stories showed that string and boolean args reach the component, while enum / select args do not; `syncProp` makes the tests pass by writing the DOM property after load. The kebab-case names (`input-id`, `logo-name`) are correct, so this is not a naming problem.

**Risk.** Tests read as if `args=size:lg` drives the story. It does not. If the Storybook arg wiring broke, nothing would fail.

**Refinement.**

1. Rename `syncProp` / `ensureProp` to one explicit helper and stop passing args that have no effect.
2. For a true arg-pipeline check, drive args through Storybook's own channel.

```ts
// fixtures/storybook.ts
/** Writes a DOM property on the host. Use when a prop cannot be set through URL args. */
export async function setHostProp<T>(host: Locator, name: string, value: T): Promise<void> {
  await host.evaluate((el, { name, value }) => {
    (el as unknown as Record<string, unknown>)[name] = value;
  }, { name, value });
}

/** Updates a story arg the way the Controls panel does (exercises the arg pipeline). */
export async function updateStoryArgs(page: Page, storyId: string, updatedArgs: Record<string, unknown>) {
  await page.evaluate(async ({ storyId, updatedArgs }) => {
    const channel = (window as any).__STORYBOOK_ADDONS_CHANNEL__;
    channel.emit('updateStoryArgs', { storyId, updatedArgs });
  }, { storyId, updatedArgs });
}
```

`__STORYBOOK_ADDONS_CHANNEL__` is a Storybook internal. It exists in Storybook 8, but it is not a public API, so keep the call in one place. *Unverified against this repo's Storybook build.*

### H2. Performance budgets gate merges and force serial execution

**Evidence.** At 4 workers only the performance tests failed. Parallel functional run: 46 s versus 102 s serial. In CI, the test step is 58 s of a roughly 4 min job (install 59 s, build 90 s, browser 22 s), so parallelism helps, but the build dominates (see M6).

**Why wall-clock budgets are the wrong tool.** They measure runner load, Storybook dev-server compile time and network, not the component. They fail for reasons unrelated to the change and are why `workers: 1` exists.

**Refinement.**

```ts
// playwright.config.ts (sketch)
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,   // tune to the runner; public repos get 4 vCPU on ubuntu-latest
  retries: process.env.CI ? 1 : 0,
  projects: [
    {
      name: 'chromium',
      testIgnore: /performance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Runs only after the functional project finishes, so nothing else is loading the machine.
      name: 'chromium-perf',
      testMatch: /performance\.spec\.ts/,
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

Run the perf project as a separate, non-blocking CI step with `--workers=1`. Keep `firefox` and `webkit` on the same split.

Measure inside the page, not around the call:

```ts
const ms = await host.evaluate((el) => new Promise<number>((resolve) => {
  const t0 = performance.now();
  (el as any).value = true;
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
}));
```

Also consider sharding (`--shard=1/2`) once the suite grows.

### H3. Tests pin questionable ARIA output and never check event payloads

**Evidence.**

- `switch/props.spec.ts` lines 40–45 assert `aria-checked` is `''` when checked and absent when unchecked. `switch/a11y.spec.ts` line 72 asserts `aria-disabled` is `''`. The test's own comment calls this "an empty attribute, not the string 'true'".
- `expectHostEventOnAction` confirms the event fired but does not read `detail`. The "click" test would pass if the event fired and the switch did not toggle.

**Why it matters.** An empty `aria-checked` is not a valid ARIA boolean, so these tests turn a possible product defect into a required behaviour. A fix in the component would break the tests.

**Refinement.** Assert the user-visible contract (native state, role, name), and raise the attribute rendering as a separate component issue.

```ts
await expect(switchPage.switchInput).toBeChecked();
await expect(switchPage.switchInput).toHaveRole('switch');   // role is exposed
await expect(switchPage.switchInput).toBeDisabled();
// Indeterminate is a DOM property on a checkbox-style input:
await expect(switchPage.switchInput).toHaveJSProperty('indeterminate', true);
```

The ARIA snapshot tests already in `a11y.spec.ts` are the right way to pin the accessibility tree. Prefer them and drop the raw attribute-value checks.

For payloads, use the helper in M3.

### H4. A green check can hide missing coverage

**Evidence.** In the observed PR run, `missingTestFolders` contained components that had source changes (badge, content-tree). Only Logo tests ran, and the check was green. `SPIKE-REPORT-1449.md` limit 3 records the same. Scope is derived from `src/components/(modus-wc-…)/` paths only, so a change to a shared type, utility or style is attributed to no component.

**Refinement.**

1. Turn `missingTestFolders` into a visible result: at minimum a PR comment section and a commit-status description ("2 changed components have no tests"). Make it blocking for components that changed in `*.tsx` or `*.stories.ts`, and advisory otherwise.
2. Map shared paths to components through the graph, or fall back to `fallbackAll` when a change touches `src/utils`, `src/types`, `src/styles` or `src/global`.
3. Add a story-ID check (M8) so a renamed story fails loudly.

```ts
// scripts/lib/git-context.ts (sketch)
const SHARED = /^src\/(utils|types|styles|global)\//;
export function needsFullRun(paths: string[]): boolean {
  return paths.some((p) => SHARED.test(p));
}
```

The folder names above are placeholders; check them against `src/` before using.

### H5. Test code is not type-checked

**Evidence.** `tsc --noEmit` reports 6 errors (for example TS2352 near line 103 of `fixtures/storybook.ts`, and an index-signature error in `css-token.ts`). Playwright transpiles TypeScript without checking types, so CI passes anyway.

**Refinement.**

```jsonc
// playwright_automation/package.json
"scripts": { "typecheck": "tsc --noEmit -p tsconfig.json" }
```

```yaml
# .github/workflows/playwright.yml, before "Run tests"
- name: Typecheck Playwright code
  working-directory: playwright_automation
  run: npm run typecheck
```

Typical fixes:

```ts
// TS2352: go through unknown
const value = (el as unknown as Record<string, unknown>)[name];

// index error on CSSStyleDeclaration
const computed = getComputedStyle(el).getPropertyValue(cssPropertyName); // use kebab-case name
```

### H6. Plan tooling can corrupt files and misreport

| Defect | Where | Effect |
| --- | --- | --- |
| Removal splits the file on `/(?=test\()/` | `apply-plan.ts` `removeTestsById` | Removing the last test in a file also drops the closing braces of its `describe` |
| IDs matched by substring | `apply-plan.ts` | `LOGO-1` also matches `LOGO-10` |
| `remove` rows are never generated; `conflicts` is always empty | `build-plan.ts` | `NEED CLARIFICATION` cannot be produced |
| Fallback `#(\d+)` for the linked issue | `git-context.ts` `parseLinkedIssueNumber` | Generated plans show `Issue #8`, whose body equals the PR template, so it very likely resolves to the PR itself |
| Loose `includes` matching on tag names | `master-sheet.ts` `sheetRowsForTag` | Rows for `button-group` can be pulled in for `button` |
| Regex title indexer cannot expand `${theme}` loops; ordinal IDs such as `LOGO-PROPS-1` | `spec-index.ts` | Parameterised tests collapse to one plan row; IDs change when tests are reordered |

`agent:apply` is not used in CI (the QA prompt tells the agent not to run it), so the blast radius is local use today. Fix it before it is used more widely.

**Refinement: remove tests with the TypeScript parser.** `typescript` is already a dependency.

```ts
import ts from 'typescript';

export function removeTestsById(source: string, ids: string[]): string {
  const sf = ts.createSourceFile('spec.ts', source, ts.ScriptTarget.Latest, true);
  const exact = ids.map((id) => new RegExp(`(\\[|tc:)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\]|\\s|$)`));
  const cuts: Array<[number, number]> = [];

  const visit = (node: ts.Node): void => {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      const callee = node.expression.expression.getText(sf);
      const title = node.expression.arguments[0];
      if (/^test(\.(skip|fixme))?$/.test(callee) && title && ts.isStringLiteralLike(title)
          && exact.some((re) => re.test(title.text))) {
        cuts.push([node.getFullStart(), node.getEnd()]);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return cuts.sort((a, b) => b[0] - a[0]).reduce((s, [from, to]) => s.slice(0, from) + s.slice(to), source);
}
```

**Refinement: index tests with Playwright itself.** `npx playwright test --list --reporter=json` returns every test with its tags and annotations, already expanded across loops, which removes the need for `spec-index.ts`'s regex parsing.

**Refinement: issue linking.** Accept only `Fixes|Closes|Resolves #N` (and full issue URLs), never a bare `#N`, and skip a number that equals the PR number.

---

## 4. Medium-severity findings and refinements

### M1. Readiness

`waitForCustomElement` waits for the tag to be defined. That says the class is registered, not that the story has rendered or that Stencil has finished the first render.

```ts
// fixtures/storybook.ts
export async function waitForStoryReady(page: Page, tag: string): Promise<void> {
  await page.locator('body.sb-show-main').waitFor({ state: 'attached' });
  await expect(page.locator('body.sb-show-errordisplay')).toHaveCount(0);
  await page.evaluate(async (t) => {
    await customElements.whenDefined(t);
    const el = document.querySelector(t) as (HTMLElement & { componentOnReady?: () => Promise<unknown> }) | null;
    await el?.componentOnReady?.();   // Stencil: resolves after first render
  }, tag);
}
```

`body.sb-show-main` and `componentOnReady` were both found to exist. After a property change, rely on web-first assertions, because `componentOnReady` does not resolve again for re-renders.

### M2. Fixtures and a console / page-error guard

Specs create `new XPage(page)` by hand and nothing fails when the page throws.

```ts
// fixtures/test.ts
import { test as base, expect } from '@playwright/test';
import { SwitchPage } from '../pages/switch.page.js';
import { LogoPage } from '../pages/logo.page.js';

type Fixtures = { switchPage: SwitchPage; logoPage: LogoPage; pageGuard: void };

export const test = base.extend<Fixtures>({
  pageGuard: [async ({ page }, use) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    await use();
    expect(problems, 'unexpected browser errors').toEqual([]);
  }, { auto: true }],
  switchPage: async ({ page }, use) => use(new SwitchPage(page)),
  logoPage: async ({ page }, use) => use(new LogoPage(page)),
});
export { expect };
```

I have **not** measured how noisy the Storybook console is. Run it once, list what appears, and allow-list known noise before making the guard blocking.

### M3. Event helper

Current behaviour: pushes into one shared `window.__modusEventHits` array, resets it on arming, never removes the listener, and discards `detail`. Replace it with a one-shot listener that returns what the Modus docs say matters (`detail.target.checked` / `.value`).

```ts
// assertions/events.ts
export interface CapturedEvent { type: string; checked?: boolean; value?: string }

export async function expectHostEvent(
  host: Locator, name: string, action: () => Promise<void>, timeout = 5_000,
): Promise<CapturedEvent> {
  const key = `__armed_${name}`;
  // evaluate (not evaluateHandle) so arming returns immediately; the promise is stored on the element.
  await host.evaluate((el, { key, name }) => {
    (el as any)[key] = new Promise((resolve) => {
      el.addEventListener(name, (e) => {
        const d = (e as CustomEvent).detail as any;
        resolve({ type: e.type, checked: d?.target?.checked, value: d?.target?.value });
      }, { once: true });
    });
  }, { key, name });

  await action();

  return host.evaluate((el, { key, name, ms }) => Promise.race([
    (el as any)[key],
    new Promise((_, reject) => setTimeout(() => reject(new Error(`No "${name}" event within ${ms} ms`)), ms)),
  ]), { key, name, ms: timeout }) as Promise<CapturedEvent>;
}
```

Usage, including the missing negative case:

```ts
const evt = await expectHostEvent(switchPage.host, 'inputChange', () => switchPage.switchInput.click());
expect(evt.checked).toBe(true);

// disabled switch must not emit
await expect(
  expectHostEvent(switchPage.host, 'inputChange', () => switchPage.switchInput.click({ force: true }), 500),
).rejects.toThrow(/No "inputChange" event/);
```

Because locators pierce open shadow roots, the same helper replaces the shadow-host variant and the hand-written `shadowRoot` code.

### M4. Accessibility coverage

- axe tags stop at `wcag21aa`; the repo's own guidelines target WCAG 2.2. Add `wcag22aa`.
- axe runs on the default theme only, so contrast in dark and Connect themes is untested.
- Results are not attached, so a failure shows a diff but not the axe report.

```ts
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
for (const theme of ['modus-modern-light', 'modus-modern-dark', 'connect-dark'] as const) {
  test(`should pass axe in ${theme} @master`, async ({ page, switchPage }, testInfo) => {
    await switchPage.gotoDefault({ value: true }, theme);   // adapt to the actual gotoDefault signature
    const results = await new AxeBuilder({ page })
      .include(switchPage.hostSelector)
      .withTags(WCAG)
      .analyze();
    await testInfo.attach('axe.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
}
```

Check that `wcag22aa` flags new violations; if it does, record them as component findings rather than disabling the tag.

### M5. Locators

| Pattern | Example | Suggestion |
| --- | --- | --- |
| CSS class / structure | `input.modus-wc-toggle[type="checkbox"]` | `getByRole('switch', { name })` for behaviour tests; keep CSS only where the class is the thing under test (geometry, tokens) |
| Positional | Logo `.logo-combined-wordmark svg, .modus-wc-logo.logo-full svg` with `.last()` | Scope to the variant under test, or assert on the accessible name (`getByRole('img', { name })`) |
| Manual `shadowRoot` | `events.ts`, `shadow-dom.spec.ts` | Playwright already pierces open shadow roots; drop the `evaluate` + `shadowRoot.querySelector` code |

### M6. Storybook dev server in CI; hard-coded URL

CI starts `storybook dev`, which compiles on demand. The job is about 4 min, of which only 58 s is testing.

```ts
// playwright.config.ts (sketch)
const baseURL = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
webServer: skipServer ? undefined : {
  command: process.env.CI
    ? 'npx --yes http-server storybook-static -p 6006 -s'   // serve a pre-built static Storybook
    : 'npm run storybook:start',
  cwd: '..',
  url: `${baseURL}/index.json`,
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
},
```

The root `storybook:build` task writes `storybook-static/`, but it also depends on `stencil:build` and `lint`. For this job, check whether `npx storybook build` after `build:ci` is enough, and whether `http-server` or another static server is already available. *Unverified.* A static build is deterministic, is faster per page, and can be reused by the Firefox and WebKit jobs and shards.

### M7. CSS specs

`test.describe.configure({ mode: 'serial' })` makes the first failing theme skip the rest, hiding which other themes fail. The themes are independent; remove it. The literal `'32px'` in the Switch CSS spec should be derived from the token or named as a constant with the reason.

### M8. Story IDs

Specs mix the `*_STORY_IDS` constants with hard-coded strings. Validate the constants once against Storybook's index (`index.json` exists and lists the stories):

```ts
// global-setup.ts
import type { FullConfig } from '@playwright/test';
import { LOGO_STORY_IDS } from './pages/logo.page.js';
import { SWITCH_STORY_IDS } from './pages/switch.page.js';
import { NAVBAR_STORY_IDS } from './pages/navbar.page.js';
import { TABLE_STORY_IDS } from './pages/table.page.js';

export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL ?? process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
  const { entries } = (await (await fetch(`${base}/index.json`)).json()) as { entries: Record<string, unknown> };
  const wanted = [LOGO_STORY_IDS, SWITCH_STORY_IDS, NAVBAR_STORY_IDS, TABLE_STORY_IDS]
    .flatMap((o) => Object.values(o)).filter((v): v is string => typeof v === 'string');
  const missing = wanted.filter((id) => !(id in entries));
  if (missing.length) throw new Error(`Story IDs missing from Storybook index: ${missing.join(', ')}`);
}
```

Then replace the hard-coded strings in specs with the constants. Adjust the object shape to the real constants.

### M9. Tagging

`@master` is in the title (and often twice: once on the `describe`, once on the test), and the config uses `grep: /@master/`. A test without the tag never runs, with no warning.

```ts
test('should render developer_console wordmark',
  { tag: '@master', annotation: { type: 'tc', description: 'LOGO-PROPS-8' } },
  async ({ page }) => { /* … */ });
```

`tag` and `annotation` need Playwright 1.42 or later (locked 1.64.1). Combine with a CI guard: `npx playwright test --list` and fail if the count of listed tests differs from the count without `grep`.

### M10. `run-scoped` duplicates `--project`

```ts
const extra = process.argv.slice(2);
const hasProject = extra.some((a) => a === '--project' || a.startsWith('--project='));
const args = ['playwright', 'test', ...(hasProject ? [] : [`--project=${project}`]), ...folders, ...extra];
```

### M11. Weak or misleading tests

| Test | Issue | Fix |
| --- | --- | --- |
| Switch "should show focus-visible outline after Tab" | Does not assert the input is focused | `await page.keyboard.press('Tab'); await expect(input).toBeFocused();` then check the outline |
| Switch "keyboard focus cycle" | Uses programmatic `.focus()` / `.blur()` | Drive with `Tab` and `Shift+Tab` |
| Switch inputChange on click | Checks only that the event fired | Use M3 and assert `checked` |
| Switch size | Only `lg` | Parameterise over all sizes |
| Navbar "props" | Tests only the embedded Logo | Cover navbar props (`visibility`, slots) or retitle |
| Navbar / Table "a11y on interactive state" | Default render only | Open the menu / change state before axe, or retitle |
| Navbar main-menu slot | `toBeAttached` only | Assert visibility and role |
| Disabled controls | No negative click test | See M3 |

### M12. Token exposure

`qa-playwright-cursor.yml` runs LLM-authored test code in a job that has `contents: write` and `pull-requests: write`. The test step unsets `GH_TOKEN`, which helps, but the job's other credentials remain, and the prompt inputs (PR body, issue text, master sheet) are influenced by people.

**Refinement.** Split into three jobs:

1. `generate` (agent edits, `contents: read`) uploads the patch as an artefact.
2. `verify` (applies the patch, runs tests, `contents: read`, no secrets) uploads the report.
3. `publish` (trusted code only, `contents: write`, `pull-requests: write`, `statuses: write`) pushes the commit and posts the comment.

---

## 5. Low-severity items

| ID | Item | Fix |
| --- | --- | --- |
| L1 | `expectComputedMatchesHostToken` is unused and contains `|| computed.includes('var(') === false`, which is always true for a computed value | Delete it |
| L1 | `ensureProp` only wraps `syncProp` | Remove |
| L1 | `gotoShadowDomParent` is copy-pasted in `LogoPage` and `SwitchPage`; Navbar and Table define shadow-parent IDs that no test uses | Move it to `BaseStorybookPage` |
| L2 | `git-context.ts` runs `execSync(`gh pr diff ${prNumber}`)` | `execFileSync('gh', ['pr', 'diff', String(Number(prNumber))])` after validating the number |
| L3 | `expandShowCodeIfCollapsed` always clicks the first "Show code" button, so it can close an open panel | Check `aria-expanded` or the snippet's visibility first |
| L4 | README is stale (see below) | Update |

### L4. Documentation drift

- README reports **48 passed** and Switch and Logo only; the suite is now 60 tests across four components.
- README references `.cursor/GOOGLE-MCP-SETUP.md` and the skill `playwright-pr-orchestrator`. Neither exists in the repository. Generated plans (`specs/*.md`) and `build-plan.ts` also point at that skill.
- README describes a "six-file" layout; the Switch and Logo folders have seven spec files.
- `SPIKE-REPORT-1449.md` limits 1, 2 and 4 are out of date: the QA workflow has run and committed Navbar and Table tests.

---

## 6. Suggested order of work

| Phase | Work | Effort | Result |
| --- | --- | --- | --- |
| 1 (about a day) | H5 typecheck; L1 deletions; M10; M7; M11 quick fixes; L4 doc fixes | Small | Cleaner baseline; no behaviour change |
| 2 | H3 + M3 (event payloads, native-state assertions); M1 readiness; M2 fixtures | Medium | Tests that can actually fail |
| 3 | H2 perf split + parallel run; M6 static Storybook; M4 axe | Medium | About 2x faster test step; broader a11y |
| 4 | H4 coverage visibility; H6 `apply-plan` and issue linking; M8 / M9; M12 job split | Medium | Trustworthy gate and safer automation |
| 5 | H1 arg-pipeline decision; Navbar / Table depth; Firefox / WebKit on PRs for a subset | Larger | Coverage depth |

## 7. Open questions

1. *Unverified:* does the bot push made with the default `GITHUB_TOKEN` trigger the required checks on the new commit?
2. Is the `aria-checked=""` rendering intended? If not, open a component issue and update the tests with it.
3. Should components with no test folder block a PR, or only warn?
4. Is a Chromium-only PR run acceptable, or should WebKit run on PRs that touch CSS?
