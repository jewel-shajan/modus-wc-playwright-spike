import { expect, test } from '@playwright/test';
import { LogoPage } from '../../../pages/logo.page.js';

test.describe('Logo shadow DOM @master', () => {
  test('should render modus-wc-logo inside logo-shadow-host @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoShadowDomParent({ name: 'trimble', emblem: true });
    const nested = logoPage.shadowHost.locator('modus-wc-logo');
    await expect(nested).toBeAttached();
    await expect(nested.locator('.modus-wc-logo')).toHaveAttribute(
      'role',
      'img'
    );
  });

  test('should propagate data-theme into shadow wrapper @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoStory({
      storyId: 'components-logo--shadow-dom-parent',
      args: { name: 'trimble', emblem: false },
      theme: 'connect-dark',
    });
    await page.waitForFunction(
      (tag) => customElements.get(tag) !== undefined,
      'logo-shadow-host'
    );
    const themeInShadow = await page.evaluate(() => {
      const host = document.querySelector('logo-shadow-host');
      const wrapper = host?.shadowRoot?.querySelector('div[data-theme]');
      return wrapper?.getAttribute('data-theme') ?? null;
    });
    expect(themeInShadow).toBe('connect-dark');
  });
});
