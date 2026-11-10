import type { Locator, Page } from '@playwright/test';
import {
  resetInteractionState,
  storyUrl,
  syncHostProperty,
  waitForCustomElement,
  type StoryUrlOptions,
} from '../fixtures/storybook.js';

export abstract class BaseStorybookPage {
  readonly page: Page;
  abstract readonly componentTag: string;
  abstract readonly hostSelector: string;

  constructor(page: Page) {
    this.page = page;
  }

  get host(): Locator {
    return this.page.locator(this.hostSelector).first();
  }

  async gotoStory(
    options: Omit<StoryUrlOptions, 'storyId'> & { storyId: string }
  ): Promise<void> {
    const url = storyUrl(options);
    await this.page.goto(url);
    await resetInteractionState(this.page);
    await waitForCustomElement(this.page, this.componentTag);
    await this.host.waitFor({ state: 'attached' });
  }

  async syncProp<T>(propName: string, expected: T): Promise<T> {
    return syncHostProperty(this.page, this.hostSelector, propName, expected);
  }

  async ensureProp<T>(propName: string, expected: T): Promise<T> {
    const synced = await this.syncProp(propName, expected);
    return synced;
  }
}
