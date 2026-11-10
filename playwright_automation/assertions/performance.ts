import { expect, type Page, type TestInfo } from '@playwright/test';

/** Wall-clock budget for opening a story and seeing the host. */
export const STORY_READY_BUDGET_MS = Number(
  process.env.PLAYWRIGHT_STORY_BUDGET_MS ?? 8_000
);

/**
 * Budget from a host property write until the rendered attribute matches.
 * Includes the property write and Playwright's locator poll. A Logo emblem
 * swap measured about 520ms locally, so 1000ms still fails a stalled update.
 */
export const UPDATE_BUDGET_MS = Number(
  process.env.PLAYWRIGHT_UPDATE_BUDGET_MS ?? 1_000
);

export function notePerformance(
  testInfo: TestInfo,
  label: string,
  ms: number
): void {
  testInfo.annotations.push({
    type: 'performance',
    description: `${label}: ${Math.round(ms)}ms`,
  });
}

export function expectWithinBudget(
  ms: number,
  budgetMs: number,
  label: string
): void {
  expect(
    Math.round(ms),
    `${label} took ${Math.round(ms)}ms; budget is ${budgetMs}ms`
  ).toBeLessThanOrEqual(budgetMs);
}

export async function timeStoryReady(
  open: () => Promise<void>
): Promise<number> {
  const start = performance.now();
  await open();
  return performance.now() - start;
}

export async function setHostProperty(
  page: Page,
  hostSelector: string,
  prop: string,
  value: string | number | boolean
): Promise<void> {
  await page.evaluate(
    ({ selector, name, next }) => {
      const host = document.querySelector(selector) as
        | (HTMLElement & Record<string, unknown>)
        | null;
      if (!host) {
        throw new Error(`Host not found: ${selector}`);
      }
      host[name] = next;
    },
    { selector: hostSelector, name: prop, next: value }
  );
}

/** Clock around an update plus the assertion that proves it rendered. */
export async function timeUntil(
  apply: () => Promise<void>
): Promise<number> {
  const start = performance.now();
  await apply();
  return performance.now() - start;
}
