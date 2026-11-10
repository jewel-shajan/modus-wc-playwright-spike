import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { storyUrl } from './storybook.js';

export interface ShowCodeExpectation {
  storyId: string;
  componentTag: string;
  snippetContains: string[];
}

export async function openDocsStory(
  page: Page,
  storyId: string
): Promise<void> {
  const url = storyUrl({ storyId, viewMode: 'docs' });
  await page.goto(url);
  await page.locator('#storybook-root, #root-inner, .sbdocs').first().waitFor({
    state: 'attached',
    timeout: 30_000,
  });
}

async function expandShowCodeIfCollapsed(page: Page): Promise<void> {
  // Docs pages render several "Show code" buttons. A multi-match locator
  // throws in strict mode; catch used to skip the click entirely.
  const showCode = page.getByRole('button', { name: /show code/i }).first();
  await showCode.click();
  await expect(page.locator('pre.prismjs').first()).toBeVisible();
}

export interface VisualSnapshot {
  role: string | null;
  className: string | null;
  width: number;
  height: number;
  markers: Record<string, string | null>;
}

/**
 * Reads the first visible host. `visualSelector` is the element that carries
 * role and class. `sizeSelector` is the box that is compared (defaults to
 * the visual element). `markers` are attributes or DOM properties on the
 * visual element, plus `viewBox` from the first svg when requested.
 */
export async function readFirstVisual(
  page: Page,
  options: {
    hostSelector: string;
    visualSelector: string;
    sizeSelector?: string;
    attributes?: string[];
    properties?: string[];
    svgViewBox?: boolean;
  }
): Promise<VisualSnapshot> {
  const {
    hostSelector,
    visualSelector,
    sizeSelector = visualSelector,
    attributes = [],
    properties = [],
    svgViewBox = false,
  } = options;

  await page.locator(hostSelector).first().waitFor({ state: 'visible' });

  return page.evaluate(
    ({ hostSelector, visualSelector, sizeSelector, attributes, properties, svgViewBox }) => {
      const host = document.querySelector(hostSelector);
      if (!host) {
        throw new Error(`Host not found: ${hostSelector}`);
      }
      const visual = host.querySelector(visualSelector);
      const sized =
        sizeSelector === hostSelector
          ? host
          : (host.querySelector(sizeSelector) ?? visual);
      if (!visual || !sized) {
        throw new Error(`Visual element not found: ${visualSelector}`);
      }
      const box = sized.getBoundingClientRect();
      const markers: Record<string, string | null> = {};
      for (const name of attributes) {
        markers[name] = visual.getAttribute(name);
      }
      for (const name of properties) {
        const value = (visual as unknown as Record<string, unknown>)[name];
        markers[name] = value == null ? null : String(value);
      }
      if (svgViewBox) {
        markers.viewBox = host.querySelector('svg')?.getAttribute('viewBox') ?? null;
      }
      return {
        role: visual.getAttribute('role'),
        className: visual.getAttribute('class'),
        width: Math.round(box.width),
        height: Math.round(box.height),
        markers,
      };
    },
    { hostSelector, visualSelector, sizeSelector, attributes, properties, svgViewBox }
  );
}

/** The docs preview matches the canvas story on role, class, markers, and size. */
export function expectDocsMatchCanvas(
  canvas: VisualSnapshot,
  docs: VisualSnapshot,
  sizeTolerancePx = 2
): void {
  expect(docs.role, 'docs role').toBe(canvas.role);
  expect(docs.className, 'docs class').toBe(canvas.className);
  expect(docs.markers).toEqual(canvas.markers);
  expect(Math.abs(docs.width - canvas.width)).toBeLessThanOrEqual(sizeTolerancePx);
  expect(Math.abs(docs.height - canvas.height)).toBeLessThanOrEqual(sizeTolerancePx);
}

export async function assertStoryShowCode(
  page: Page,
  expectation: ShowCodeExpectation
): Promise<void> {
  await openDocsStory(page, expectation.storyId);
  await expandShowCodeIfCollapsed(page);

  const codeRegion: Locator = page
    .locator('pre.prismjs')
    .filter({ hasText: expectation.componentTag })
    .first();

  await expect(codeRegion).toBeVisible({ timeout: 15_000 });
  const text = await codeRegion.innerText();
  for (const fragment of expectation.snippetContains) {
    expect(text).toContain(fragment);
  }
}
