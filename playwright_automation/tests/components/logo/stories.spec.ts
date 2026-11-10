import { expect, test } from '@playwright/test';
import { openDocsStory } from '../../../fixtures/showCodeFixture.js';
import { LOGO_STORY_IDS, LogoPage } from '../../../pages/logo.page.js';

test.describe('Logo stories @master', () => {
  test('should render default canvas with role img @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncName('trimble');
    await logoPage.syncEmblem(false);
    await expect(logoPage.logoRoot).toHaveAttribute('role', 'img');
    await expect(logoPage.primarySvg).toBeAttached();
  });

  test('should apply custom size classes on CustomSizeWithClass @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoStory({ storyId: LOGO_STORY_IDS.customSizeWithClass });
    await expect(
      page.locator('.modus-wc-logo.logo-small').first()
    ).toBeVisible();
    await expect(
      page.locator('.modus-wc-logo.emblem-lg').first()
    ).toBeVisible();
  });

  test('should render ShadowDomParent with logo-shadow-host @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoShadowDomParent({ name: 'trimble', emblem: true });
    await expect(logoPage.shadowHost).toBeAttached();
    await expect(logoPage.shadowHost.locator('modus-wc-logo')).toBeAttached();
  });

  test('should load autodocs describing Trimble logos @master', async ({
    page,
  }) => {
    await openDocsStory(page, LOGO_STORY_IDS.docs);
    await expect(
      page.getByRole('heading', { name: /logo/i }).first()
    ).toBeVisible();
    await expect(
      page.locator('text=Trimble product logos').first()
    ).toBeAttached();
  });
});
