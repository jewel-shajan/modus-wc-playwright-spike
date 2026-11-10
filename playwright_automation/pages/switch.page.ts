import type { Locator, Page } from '@playwright/test';
import { BaseStorybookPage } from './base.page.js';

export const SWITCH_STORY_IDS = {
  default: 'components-forms-switch--default',
  shadowDomParent: 'components-forms-switch--shadow-dom-parent',
  docs: 'components-forms-switch--docs',
} as const;

export class SwitchPage extends BaseStorybookPage {
  readonly componentTag = 'modus-wc-switch';
  readonly hostSelector = 'modus-wc-switch';
  readonly shadowHostSelector = 'switch-shadow-host';

  constructor(page: Page) {
    super(page);
  }

  get switchInput(): Locator {
    return this.host.locator('input.modus-wc-toggle[type="checkbox"]');
  }

  get label(): Locator {
    return this.host.locator('modus-wc-input-label label');
  }

  get shadowHost(): Locator {
    return this.page.locator(this.shadowHostSelector).first();
  }

  async gotoDefault(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({ storyId: SWITCH_STORY_IDS.default, args });
  }

  async gotoShadowDomParent(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({
      storyId: SWITCH_STORY_IDS.shadowDomParent,
      args,
    });
    await this.page.waitForFunction(
      (tag) => customElements.get(tag) !== undefined,
      this.shadowHostSelector
    );
  }

  async syncSize(size: string): Promise<string> {
    return this.ensureProp('size', size);
  }

  async syncValue(value: boolean): Promise<boolean> {
    return this.ensureProp('value', value);
  }

  async syncDisabled(disabled: boolean): Promise<boolean> {
    return this.ensureProp('disabled', disabled);
  }

  async syncIndeterminate(indeterminate: boolean): Promise<boolean> {
    return this.ensureProp('indeterminate', indeterminate);
  }

  async getAriaChecked(): Promise<string | null> {
    return this.switchInput.getAttribute('aria-checked');
  }

  async getInputId(): Promise<string | null> {
    return this.switchInput.getAttribute('id');
  }

  async getLabelFor(): Promise<string | null> {
    return this.label.getAttribute('for');
  }

  async focusSwitchViaTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
    await this.switchInput.waitFor({ state: 'visible' });
  }

  async readToggleOpacity(): Promise<string> {
    return this.switchInput.evaluate((el) =>
      getComputedStyle(el).opacity.trim()
    );
  }

  async readToggleOutlineWidth(): Promise<string> {
    return this.switchInput.evaluate((el) =>
      getComputedStyle(el).outlineWidth.trim()
    );
  }

  async readToggleCursor(): Promise<string> {
    return this.switchInput.evaluate((el) =>
      getComputedStyle(el).cursor.trim()
    );
  }
}
