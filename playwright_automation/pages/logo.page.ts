import type { Locator, Page } from '@playwright/test';
import { BaseStorybookPage } from './base.page.js';

export const LOGO_STORY_IDS = {
  default: 'components-logo--default',
  customSizeWithClass: 'components-logo--custom-size-with-class',
  shadowDomParent: 'components-logo--shadow-dom-parent',
  docs: 'components-logo--docs',
} as const;

export class LogoPage extends BaseStorybookPage {
  readonly componentTag = 'modus-wc-logo';
  readonly hostSelector = 'modus-wc-logo';
  readonly shadowHostSelector = 'logo-shadow-host';

  constructor(page: Page) {
    super(page);
  }

  get logoRoot(): Locator {
    return this.host.locator('.modus-wc-logo');
  }

  get primarySvg(): Locator {
    return this.host.locator('svg').first();
  }

  get shadowHost(): Locator {
    return this.page.locator(this.shadowHostSelector).first();
  }

  async gotoDefault(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({ storyId: LOGO_STORY_IDS.default, args });
  }

  async gotoShadowDomParent(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({
      storyId: LOGO_STORY_IDS.shadowDomParent,
      args,
    });
    await this.page.waitForFunction(
      (tag) => customElements.get(tag) !== undefined,
      this.shadowHostSelector
    );
  }

  async syncName(name: string): Promise<string> {
    return this.ensureProp('name', name);
  }

  async syncEmblem(emblem: boolean): Promise<boolean> {
    return this.ensureProp('emblem', emblem);
  }

  async getAriaLabel(): Promise<string | null> {
    return this.logoRoot.getAttribute('aria-label');
  }

  async getLogoRole(): Promise<string | null> {
    return this.logoRoot.getAttribute('role');
  }
}
