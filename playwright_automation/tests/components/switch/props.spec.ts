import { expect, test } from '@playwright/test';
import { expectHostEventOnAction } from '../../../assertions/events.js';
import { SwitchPage } from '../../../pages/switch.page.js';

test.describe('Switch props and events @master', () => {
  test('should reflect size prop on host after sync fallback @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ size: 'lg', value: true });
    const size = await switchPage.syncSize('lg');
    expect(size).toBe('lg');
    await expect(switchPage.switchInput).toHaveClass(/modus-wc-toggle-lg/);
  });

  test('should associate label for attribute with input id @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({
      label: 'Power',
      value: true,
      'input-id': 'switch-power',
    });
    await switchPage.syncProp('inputId', 'switch-power');
    const inputId = await switchPage.getInputId();
    const labelFor = await switchPage.getLabelFor();
    expect(inputId).toBe('switch-power');
    expect(labelFor).toBe(inputId);
    await expect(switchPage.label).toHaveText('Power');
  });

  test('should expose aria-checked true false and mixed @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true });
    await switchPage.syncValue(true);
    await expect(switchPage.switchInput).toBeChecked();
    // Boolean true is rendered as an empty attribute, not the string "true".
    expect(await switchPage.getAriaChecked()).toBe('');

    await switchPage.syncValue(false);
    await expect(switchPage.switchInput).not.toBeChecked();
    expect(await switchPage.getAriaChecked()).toBeNull();

    await switchPage.syncIndeterminate(true);
    await expect
      .poll(() => switchPage.getAriaChecked(), { timeout: 5_000 })
      .toBe('mixed');
  });

  test('should emit inputChange on click when enabled @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: false, disabled: false });
    await switchPage.syncDisabled(false);
    await expectHostEventOnAction(
      page,
      switchPage.hostSelector,
      'inputChange',
      async () => {
        await switchPage.switchInput.click();
      }
    );
  });

  test('should emit inputFocus and inputBlur on keyboard focus cycle @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, disabled: false });
    await switchPage.syncDisabled(false);

    await switchPage.switchInput.evaluate((el: HTMLElement) => el.blur());
    await expectHostEventOnAction(
      page,
      switchPage.hostSelector,
      'inputFocus',
      () => switchPage.switchInput.focus()
    );
    await expectHostEventOnAction(
      page,
      switchPage.hostSelector,
      'inputBlur',
      () => switchPage.switchInput.evaluate((el: HTMLElement) => el.blur())
    );
  });
});
