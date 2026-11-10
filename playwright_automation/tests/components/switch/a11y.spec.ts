import { expect, test } from '@playwright/test';
import { expectHostEventOnAction } from '../../../assertions/events.js';
import { runAxeOnStory } from '../../../fixtures/a11y.js';
import { resetInteractionState } from '../../../fixtures/storybook.js';
import { SwitchPage } from '../../../pages/switch.page.js';

test.describe('Switch accessibility @master', () => {
  test('should pass axe on default enabled state @master', async ({ page }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, label: 'Notifications' });
    await runAxeOnStory(page, { context: switchPage.hostSelector });
  });

  test('should pass axe when disabled @master', async ({ page }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ disabled: true, value: false });
    await switchPage.syncDisabled(true);
    await runAxeOnStory(page, { context: switchPage.hostSelector });
  });

  test('should match ARIA snapshot for switch role @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, label: 'Alerts' });
    await expect(switchPage.switchInput).toMatchAriaSnapshot(`
      - switch "Alerts" [checked]
    `);
  });

  test('should toggle via Space without brittle timeout and emit inputChange @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: false, disabled: false });
    await switchPage.syncDisabled(false);
    await resetInteractionState(page);

    await switchPage.switchInput.focus();
    await expectHostEventOnAction(
      page,
      switchPage.hostSelector,
      'inputChange',
      () => page.keyboard.press('Space')
    );
  });

  test('should show focus-visible outline after Tab @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, disabled: false });
    await switchPage.syncDisabled(false);
    await resetInteractionState(page);
    await switchPage.focusSwitchViaTab();
    const outlineWidth = await switchPage.readToggleOutlineWidth();
    expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
  });

  test('should expose aria-disabled and reduced opacity when disabled @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoStory({
      storyId: 'components-forms-switch--default',
      args: { disabled: true, value: false },
      theme: 'modus-classic-light',
    });
    await switchPage.syncDisabled(true);
    await expect(switchPage.switchInput).toBeDisabled();
    // Boolean true is rendered as an empty attribute, not the string "true".
    await expect(switchPage.switchInput).toHaveAttribute('aria-disabled', '');
    const opacity = parseFloat(await switchPage.readToggleOpacity());
    expect(opacity).toBeLessThanOrEqual(0.5);
  });
});
