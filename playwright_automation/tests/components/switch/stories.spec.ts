import { expect, test } from '@playwright/test';
import { openDocsStory } from '../../../fixtures/showCodeFixture.js';
import { getDocumentTheme } from '../../../fixtures/storybook.js';
import { SWITCH_STORY_IDS, SwitchPage } from '../../../pages/switch.page.js';

test.describe('Switch stories @master', () => {
  test('should render default canvas story with host and switch input @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, label: 'Label' });
    await expect(switchPage.host).toHaveClass(/modus-wc-switch-host/);
    await expect(switchPage.switchInput).toHaveAttribute('role', 'switch');
    await expect(switchPage.switchInput).toBeChecked();
    const theme = await getDocumentTheme(page);
    expect(theme).toBeTruthy();
  });

  test('should render ShadowDomParent story with nested shadow host @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoShadowDomParent({ value: false, label: 'Shadow' });
    await expect(switchPage.shadowHost).toBeAttached();
    const innerSwitch = switchPage.shadowHost.locator('modus-wc-switch');
    await expect(innerSwitch).toBeAttached();
    await expect(innerSwitch.locator('input.modus-wc-toggle')).toHaveAttribute(
      'role',
      'switch'
    );
  });

  test('should load autodocs for Switch component @master', async ({
    page,
  }) => {
    await openDocsStory(page, SWITCH_STORY_IDS.docs);
    await expect(
      page.getByRole('heading', { name: /switch/i }).first()
    ).toBeVisible();
    await expect(
      page.locator('text=customizable switch').first()
    ).toBeAttached();
  });
});
