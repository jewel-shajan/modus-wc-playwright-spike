import { test } from '@playwright/test';
import {
  assertStoryShowCode,
  expectDocsMatchCanvas,
  readFirstVisual,
} from '../../../fixtures/showCodeFixture.js';
import { SWITCH_STORY_IDS, SwitchPage } from '../../../pages/switch.page.js';

const switchVisual = {
  hostSelector: 'modus-wc-switch',
  visualSelector: 'input.modus-wc-toggle',
  sizeSelector: 'modus-wc-switch',
  attributes: ['aria-checked'],
  properties: ['checked'],
} as const;

test.describe('Switch show code @master', () => {
  test('should render story snippet with modus-wc-switch in docs @master', async ({
    page,
  }) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault();
    const canvas = await readFirstVisual(page, switchVisual);

    await assertStoryShowCode(page, {
      storyId: SWITCH_STORY_IDS.docs,
      componentTag: 'modus-wc-switch',
      snippetContains: ['modus-wc-switch', 'label'],
    });

    const docs = await readFirstVisual(page, switchVisual);
    expectDocsMatchCanvas(canvas, docs);
  });
});
