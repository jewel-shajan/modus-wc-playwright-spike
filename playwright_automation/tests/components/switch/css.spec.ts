import { expect, test } from '@playwright/test';
import {
  expectBorderRadiusMatchesHostToken,
  expectCssToken,
} from '../../../assertions/css-token.js';
import { MODUS_THEMES } from '../../../fixtures/themes.js';
import { SwitchPage } from '../../../pages/switch.page.js';

test.describe.configure({ mode: 'serial' });

test.describe('Switch CSS tokens across themes @master', () => {
  for (const theme of MODUS_THEMES) {
    test(`should resolve --rounded-badge on host and apply to toggle for ${theme} @master`, async ({
      page,
    }) => {
      const switchPage = new SwitchPage(page);
      await switchPage.gotoStory({
        storyId: 'components-forms-switch--default',
        args: { value: true },
        theme,
      });
      await expectCssToken(
        page,
        switchPage.hostSelector,
        '--rounded-badge',
        '32px'
      );
      await expectBorderRadiusMatchesHostToken(
        page,
        switchPage.switchInput,
        switchPage.hostSelector,
        '--rounded-badge'
      );
      const documentTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );
      expect(documentTheme).toBe(theme);
    });
  }

  test('should not read --rounded-badge from document root @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true });
    const rootValue = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--rounded-badge')
        .trim()
    );
    await expect
      .poll(
        () =>
          page.evaluate((selector) => {
            const host = document.querySelector(selector);
            return host
              ? getComputedStyle(host)
                  .getPropertyValue('--rounded-badge')
                  .trim()
              : '';
          }, switchPage.hostSelector),
        { timeout: 10_000 }
      )
      .toBe('32px');
    const hostValue = '32px';
    expect(rootValue).not.toBe(hostValue);
  });
});
