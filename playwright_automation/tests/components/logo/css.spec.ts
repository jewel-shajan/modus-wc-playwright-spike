import { expect, test } from '@playwright/test';
import { expectColorMatchesTokenOrRgbOklch } from '../../../assertions/css-token.js';
import { MODUS_THEMES } from '../../../fixtures/themes.js';
import { LogoPage } from '../../../pages/logo.page.js';

test.describe.configure({ mode: 'serial' });

test.describe('Logo CSS tokens across themes @master', () => {
  for (const theme of MODUS_THEMES) {
    test(`should resolve logo fill tokens on host for ${theme} @master`, async ({
      page,
    }) => {
      const logoPage = new LogoPage(page);
      await logoPage.gotoStory({
        storyId: 'components-logo--default',
        args: { name: 'trimble', emblem: true },
        theme,
      });
      await logoPage.syncEmblem(true);
      const accent = logoPage.host.locator('svg .logo-accent').first();
      await expect(accent).toBeAttached();
      await expectColorMatchesTokenOrRgbOklch(
        page,
        accent,
        logoPage.hostSelector,
        '--modus-wc-color-primary'
      );
      const documentTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );
      expect(documentTheme).toBe(theme);
    });
  }
});
