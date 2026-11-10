import type { Page } from '@playwright/test';
import type { ModusThemeId } from './themes.js';
import { themeGlobalsQuery } from './themes.js';

export type StoryArgValue = string | number | boolean | undefined;

export interface StoryUrlOptions {
  storyId: string;
  args?: Record<string, StoryArgValue>;
  theme?: ModusThemeId;
  viewMode?: 'story' | 'docs';
}

function encodeArgValue(value: StoryArgValue): string {
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return encodeURIComponent(String(value));
}

function buildArgsSegment(args: Record<string, StoryArgValue>): string {
  const pairs = Object.entries(args)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => `${key}:${encodeArgValue(value)}`);
  if (pairs.length === 0) {
    return '';
  }
  return `args=${pairs.join(';')}`;
}

/**
 * Builds Storybook iframe URLs with unencoded semicolon arg separators.
 * URLSearchParams encodes ";" as %3B and can hang the iframe spinner.
 */
export function storyUrl(options: StoryUrlOptions): string {
  const { storyId, args = {}, theme, viewMode = 'story' } = options;
  const segments: string[] = [`/iframe.html?id=${storyId}`];
  const argsSegment = buildArgsSegment(args);
  if (argsSegment) {
    segments.push(argsSegment);
  }
  if (theme) {
    segments.push(themeGlobalsQuery(theme));
  }
  if (viewMode === 'docs') {
    segments.push('viewMode=docs');
  }
  return segments.join('&');
}

export const DEFAULT_VIEWPORT = { width: 1280, height: 720 } as const;

export async function resetInteractionState(page: Page): Promise<void> {
  await page.setViewportSize(DEFAULT_VIEWPORT);
  await page.mouse.move(0, 0);
}

export async function waitForCustomElement(
  page: Page,
  tagName: string
): Promise<void> {
  await page.waitForFunction(
    (tag) => customElements.get(tag) !== undefined,
    tagName,
    { timeout: 30_000 }
  );
  await page.evaluate((tag) => customElements.whenDefined(tag), tagName);
}

export async function syncHostProperty<T>(
  page: Page,
  hostSelector: string,
  propName: string,
  expected: T
): Promise<T> {
  return page.evaluate(
    ({ selector, name, value }) => {
      const host = document.querySelector(selector) as Record<string, unknown> &
        HTMLElement;
      if (!host) {
        throw new Error(`Host not found: ${selector}`);
      }
      const current = host[name];
      if (current !== value) {
        host[name] = value;
      }
      return host[name] as T;
    },
    { selector: hostSelector, name: propName, value: expected }
  );
}

export async function readHostProperty<T>(
  page: Page,
  hostSelector: string,
  propName: string
): Promise<T> {
  return page.evaluate(
    ({ selector, name }) => {
      const host = document.querySelector(selector) as Record<string, unknown>;
      if (!host) {
        throw new Error(`Host not found: ${selector}`);
      }
      return host[name] as T;
    },
    { selector: hostSelector, name: propName }
  );
}

export async function getDocumentTheme(page: Page): Promise<string | null> {
  return page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );
}
