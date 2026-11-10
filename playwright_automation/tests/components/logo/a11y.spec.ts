import { expect, test } from '@playwright/test';
import { runAxeOnStory } from '../../../fixtures/a11y.js';
import { LogoPage } from '../../../pages/logo.page.js';

test.describe('Logo accessibility @master', () => {
  test('should pass axe on full wordmark @master', async ({ page }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncEmblem(false);
    await runAxeOnStory(page, { context: logoPage.hostSelector });
  });

  test('should pass axe on emblem variant @master', async ({ page }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: true });
    await logoPage.syncEmblem(true);
    await runAxeOnStory(page, { context: logoPage.hostSelector });
  });

  test('should match ARIA snapshot for img role @master', async ({ page }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({
      name: 'trimble',
      emblem: true,
      alt: 'Trimble',
    });
    await logoPage.syncProp('alt', 'Trimble');
    await expect(logoPage.logoRoot).toBeVisible();
    await expect(logoPage.logoRoot).toMatchAriaSnapshot(`
      - img "Trimble"
    `);
  });
});
