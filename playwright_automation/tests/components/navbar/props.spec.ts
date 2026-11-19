import { expect, test } from '@playwright/test';
import { NavbarPage } from '../../../pages/navbar.page.js';

test.describe('Navbar props @master', () => {
  test('should cover public props for navbar [navbar-props] @master', async ({
    page,
  }) => {
    const navbarPage = new NavbarPage(page);
    await navbarPage.gotoDefault({
      'logo-name': 'developer_console',
      condensed: false,
    });
    await navbarPage.syncLogoName('developer_console');
    await navbarPage.syncCondensed(false);

    const logoRoot = navbarPage.embeddedLogo.locator('.modus-wc-logo');
    await expect(logoRoot).toHaveClass(/logo-full/);
    await expect(logoRoot).not.toHaveClass(/logo-combined/);
    await expect(navbarPage.embeddedLogo.locator('svg').first()).toBeAttached();
  });
});
