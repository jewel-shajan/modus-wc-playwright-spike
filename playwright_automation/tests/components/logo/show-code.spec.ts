import { test } from '@playwright/test';
import {
  assertStoryShowCode,
  expectDocsMatchCanvas,
  readFirstVisual,
} from '../../../fixtures/showCodeFixture.js';
import { LOGO_STORY_IDS, LogoPage } from '../../../pages/logo.page.js';

const logoVisual = {
  hostSelector: 'modus-wc-logo',
  visualSelector: '.modus-wc-logo',
  attributes: ['aria-label'],
  svgViewBox: true,
} as const;

test.describe('Logo show code @master', () => {
  test('should render docs snippet containing modus-wc-logo @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncName('trimble');
    await logoPage.syncEmblem(false);
    const canvas = await readFirstVisual(page, logoVisual);

    await assertStoryShowCode(page, {
      storyId: LOGO_STORY_IDS.docs,
      componentTag: 'modus-wc-logo',
      snippetContains: ['modus-wc-logo', 'name', 'trimble'],
    });

    const docs = await readFirstVisual(page, logoVisual);
    expectDocsMatchCanvas(canvas, docs);
  });
});
