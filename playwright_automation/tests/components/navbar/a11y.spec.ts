import { test } from '@playwright/test';
import { runAxeOnStory } from '../../../fixtures/a11y.js';
import { NavbarPage } from '../../../pages/navbar.page.js';

test.describe('Navbar accessibility @master', () => {
  test('should pass axe on interactive state for navbar [navbar-a11y] @master', async ({
    page,
  }) => {
    const navbarPage = new NavbarPage(page);
    await navbarPage.gotoDefault({ 'logo-name': 'trimble' });
    await runAxeOnStory(page, { context: navbarPage.hostSelector });
  });
});
