import { expect, test } from '@playwright/test';
import { expectShadowHostEventOnAction } from '../../../assertions/events.js';
import { SwitchPage } from '../../../pages/switch.page.js';

test.describe('Switch shadow DOM @master', () => {
  test('should mount modus-wc-switch inside open shadow root @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoShadowDomParent({ value: true, label: 'Nested' });
    const shadowRootHandle = await switchPage.shadowHost.evaluateHandle((el) =>
      el.shadowRoot ? el.shadowRoot : null
    );
    const shadowRoot = shadowRootHandle.asElement();
    expect(shadowRoot).toBeTruthy();

    const hasComponent = await page.evaluate(() => {
      const host = document.querySelector('switch-shadow-host');
      if (!host?.shadowRoot) {
        return false;
      }
      return !!host.shadowRoot.querySelector('modus-wc-switch');
    });
    expect(hasComponent).toBe(true);
  });

  test('should sync data-theme onto shadow wrapper @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoStory({
      storyId: 'components-forms-switch--shadow-dom-parent',
      args: { value: true },
      theme: 'modus-modern-dark',
    });
    await page.waitForFunction(
      (tag) => customElements.get(tag) !== undefined,
      'switch-shadow-host'
    );
    const wrapperTheme = await page.evaluate(() => {
      const host = document.querySelector('switch-shadow-host');
      if (!host?.shadowRoot) {
        return null;
      }
      const wrapper = host.shadowRoot.querySelector('div[data-theme]');
      return wrapper?.getAttribute('data-theme') ?? null;
    });
    expect(wrapperTheme).toBe('modus-modern-dark');
  });

  test('should operate switch input inside shadow boundary @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoShadowDomParent({ value: false, disabled: false });
    const innerInput = switchPage.shadowHost.locator(
      'modus-wc-switch input.modus-wc-toggle'
    );
    await expect(innerInput).toHaveAttribute('role', 'switch');
    await expectShadowHostEventOnAction(
      page,
      'switch-shadow-host',
      'modus-wc-switch',
      'inputChange',
      () => innerInput.evaluate((el: HTMLInputElement) => el.click())
    );
  });
});
