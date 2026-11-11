import { expect, test } from '@playwright/test';
import { NavbarPage } from '../../../pages/navbar.page.js';

test.describe('Navbar stories @master', () => {
  test('should cover default stories for navbar [navbar-stories] @master', async ({
    page,
  }) => {
    const navbarPage = new NavbarPage(page);
    await navbarPage.gotoDefault({ 'logo-name': 'trimble' });
    await expect(navbarPage.host).toBeAttached();
    await expect(navbarPage.host).toBeVisible();
    await expect(navbarPage.embeddedLogo).toBeAttached();
    await expect(navbarPage.mainMenuSlot).toBeAttached();
  });
});
