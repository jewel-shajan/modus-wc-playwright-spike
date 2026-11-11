import type { Locator, Page } from '@playwright/test';
import { BaseStorybookPage } from './base.page.js';

export const TABLE_STORY_IDS = {
  default: 'components-table--default',
  shadowDomParent: 'components-table--shadow-dom-parent',
} as const;

export class TablePage extends BaseStorybookPage {
  readonly componentTag = 'modus-wc-table';
  readonly hostSelector = 'modus-wc-table';

  constructor(page: Page) {
    super(page);
  }

  get tableRoot(): Locator {
    return this.host.locator('.modus-wc-table').first();
  }

  get headerCells(): Locator {
    return this.host.locator('thead th');
  }

  get bodyRows(): Locator {
    return this.host.locator('tbody tr');
  }

  async gotoDefault(
    args: Record<string, string | number | boolean | undefined> = {}
  ): Promise<void> {
    await this.gotoStory({ storyId: TABLE_STORY_IDS.default, args });
  }

  async syncHover(hover: boolean): Promise<boolean> {
    return this.ensureProp('hover', hover);
  }

  async syncDensity(density: string): Promise<string> {
    return this.ensureProp('density', density);
  }
}
