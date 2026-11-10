import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface RunAxeOptions {
  /** CSS selector scoped as axe context (defaults to document). */
  context?: string;
  /** axe tags to include (e.g. wcag2a, wcag2aa). */
  tags?: string[];
}

export async function runAxeOnStory(
  page: Page,
  options: RunAxeOptions = {}
): Promise<void> {
  const { context, tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } =
    options;
  let builder = new AxeBuilder({ page }).withTags(tags);
  if (context) {
    builder = builder.include(context);
  }
  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']
): string {
  if (violations.length === 0) {
    return '';
  }
  return violations
    .map(
      (v) =>
        `${v.id}: ${v.description}\n${v.nodes.map((n) => n.html).join('\n')}`
    )
    .join('\n\n');
}
