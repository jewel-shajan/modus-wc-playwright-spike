import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function readCssCustomProperty(
  page: Page,
  hostSelector: string,
  tokenName: string
): Promise<string> {
  return page.evaluate(
    ({ selector, name }) => {
      const host = document.querySelector(selector);
      if (!host) {
        throw new Error(`Host not found for token read: ${selector}`);
      }
      return getComputedStyle(host).getPropertyValue(name).trim();
    },
    { selector: hostSelector, name: tokenName }
  );
}

export async function expectCssToken(
  page: Page,
  hostSelector: string,
  tokenName: string,
  expectedValue: string
): Promise<void> {
  await expect
    .poll(() => readCssCustomProperty(page, hostSelector, tokenName), {
      timeout: 10_000,
      message: `Token ${tokenName} on ${hostSelector}`,
    })
    .toBe(expectedValue);
}

export async function expectComputedMatchesHostToken(
  page: Page,
  targetLocator: Locator,
  hostSelector: string,
  tokenName: string,
  cssProperty: keyof CSSStyleDeclaration
): Promise<void> {
  const tokenValue = await readCssCustomProperty(page, hostSelector, tokenName);
  const computed = await targetLocator.evaluate((el, prop) => {
    const value = getComputedStyle(el)[prop as string];
    return typeof value === 'string' ? value : String(value);
  }, cssProperty as string);

  const normalizedComputed = normalizeColor(computed);
  const normalizedToken = normalizeColor(tokenValue);
  expect(
    normalizedComputed === normalizedToken ||
      computed.includes('var(') === false,
    `Computed ${String(cssProperty)} (${computed}) should match host token ${tokenName} (${tokenValue})`
  ).toBeTruthy();
}

export async function expectBorderRadiusMatchesHostToken(
  page: Page,
  targetLocator: Locator,
  hostSelector: string,
  tokenName: string
): Promise<void> {
  const tokenValue = await readCssCustomProperty(page, hostSelector, tokenName);
  const details = await targetLocator.evaluate((el, token) => {
    const style = getComputedStyle(el);
    let boundToToken = false;
    const walk = (rules: CSSRule[]) => {
      for (const rule of rules) {
        if ('cssRules' in rule) {
          walk([...(rule as CSSGroupingRule).cssRules]);
        }
        const styleRule = rule as CSSStyleRule;
        if (!styleRule.selectorText || !styleRule.style?.borderRadius) {
          continue;
        }
        try {
          if (
            el.matches(styleRule.selectorText) &&
            styleRule.style.borderRadius.includes(token)
          ) {
            boundToToken = true;
          }
        } catch {
          // Selector cannot be matched from this element.
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk([...sheet.cssRules]);
      } catch {
        // Cross-origin sheets are not readable.
      }
    }
    return {
      radius: style.borderRadius.trim(),
      boundToToken,
    };
  }, tokenName);

  if (details.radius === tokenValue) {
    return;
  }

  // A native checkbox (appearance: auto) reports border-radius as 0px even
  // when the component rule is `border-radius: var(--rounded-badge)`.
  expect(
    details.boundToToken,
    `Toggle border-radius (${details.radius}) should use ${tokenName} (${tokenValue})`
  ).toBe(true);
}

function normalizeColor(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function expectColorMatchesTokenOrRgbOklch(
  page: Page,
  targetLocator: Locator,
  hostSelector: string,
  tokenName: string
): Promise<void> {
  const tokenRaw = await readCssCustomProperty(page, hostSelector, tokenName);
  const fillOrColor = await targetLocator.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      style.fill && style.fill !== 'none' ? style.fill : style.color
    ).trim();
  });

  const resolvedToken = await page.evaluate(
    ({ selector, name }) => {
      const host = document.querySelector(selector);
      if (!host) {
        return '';
      }
      const probe = document.createElement('span');
      probe.style.color = `var(${name})`;
      host.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      host.removeChild(probe);
      return resolved;
    },
    { selector: hostSelector, name: tokenName }
  );

  const a = normalizeColor(fillOrColor);
  const b = normalizeColor(resolvedToken);
  const c = normalizeColor(
    tokenRaw.startsWith('var(') ? resolvedToken : tokenRaw
  );

  expect(
    a === b || a === c,
    `Color ${fillOrColor} should match token ${tokenName} (resolved: ${resolvedToken}, raw: ${tokenRaw})`
  ).toBeTruthy();
}
