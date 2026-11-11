import type { Locator, Page } from '@playwright/test';
import { BaseStorybookPage } from './base.page.js';

export const NAVBAR_STORY_IDS = {
  default: 'components-navbar--default',
  shadowDomParent: 'components-navbar--shadow-dom-parent',
} as const;

export class NavbarPage extends BaseStorybookPage {
  readonly componentTag = 'modus-wc-navbar';
  readonly hostSelector = 'modus-wc-navbar';

  constructor(page: Page) {
    super(page);
  }

  get embeddedLogo(): Locator {
    return this.host.locator('modus-wc-logo').first();
  }

  get mainMenuSlot(): Locator {
    return this.page
      .locator(`${this.hostSelector} > [slot="main-menu"]`)
      .first();
  }

  async gotoDefault(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({ storyId: NAVBAR_STORY_IDS.default, args });
  }

  async syncLogoName(name: string): Promise<string> {
    return this.ensureProp('logoName', name);
  }

  async syncCondensed(condensed: boolean): Promise<boolean> {
    return this.ensureProp('condensed', condensed);
  }
}
