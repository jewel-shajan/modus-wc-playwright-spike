import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { expectColorMatchesTokenOrRgbOklch } from './css-token.js';

export async function expectSvgViewBox(
  svgLocator: Locator,
  expectedViewBox: string
): Promise<void> {
  await expect(svgLocator).toHaveAttribute('viewBox', expectedViewBox);
}

export async function expectSvgGeometry(
  page: Page,
  hostSelector: string,
  svgLocator: Locator,
  expectedViewBox: string,
  fillClassAssertions: Array<{ selector: string; tokenName: string }>
): Promise<void> {
  await expectSvgViewBox(svgLocator, expectedViewBox);
  for (const { selector, tokenName } of fillClassAssertions) {
    const path = svgLocator.locator(selector).first();
    await expect(path).toBeAttached();
    await expectColorMatchesTokenOrRgbOklch(
      page,
      path,
      hostSelector,
      tokenName
    );
  }
}

/** Trimble emblem vs wordmark geometry (Logo spike #1448). */
export const TRIMBLE_EMBLEM_VIEWBOX = '0 0 32 32';
export const TRIMBLE_WORDMARK_VIEWBOX = '0 0 106 32';

/** Connect emblem vs full wordmark. The wordmark check is what caught the injected emblem bug. */
export const CONNECT_EMBLEM_VIEWBOX = '0 0 32 32';
export const CONNECT_WORDMARK_VIEWBOX = '0 0 67 30';

/** Default Trimble emblem and wordmark paths use this class. */
export const TRIMBLE_ACCENT_FILL = {
  selector: '.logo-accent',
  tokenName: '--modus-wc-color-primary',
} as const;
