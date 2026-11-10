import { expect, test } from '@playwright/test';
import {
  expectWithinBudget,
  notePerformance,
  setHostProperty,
  STORY_READY_BUDGET_MS,
  timeStoryReady,
  timeUntil,
  UPDATE_BUDGET_MS,
} from '../../../assertions/performance.js';
import { LogoPage } from '../../../pages/logo.page.js';

test.describe('Logo performance @master', () => {
  test('should show the default story within the ready budget @master', async ({
    page,
  }, testInfo) => {
    const logoPage = new LogoPage(page);
    const ms = await timeStoryReady(() =>
      logoPage.gotoDefault({ name: 'trimble', emblem: false })
    );
    notePerformance(testInfo, 'logo story ready', ms);
    await expect(logoPage.logoRoot).toHaveAttribute('role', 'img');
    expectWithinBudget(ms, STORY_READY_BUDGET_MS, 'logo story ready');
  });

  test('should apply a name change within the update budget @master', async ({
    page,
  }, testInfo) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncName('trimble');

    const ms = await timeUntil(async () => {
      await setHostProperty(page, logoPage.hostSelector, 'name', 'connect');
      await expect(logoPage.logoRoot).toHaveAttribute('aria-label', /connect/i, {
        timeout: UPDATE_BUDGET_MS,
      });
    });
    notePerformance(testInfo, 'logo name update', ms);
    expectWithinBudget(ms, UPDATE_BUDGET_MS, 'logo name update');
  });

  test('should apply an emblem change within the update budget @master', async ({
    page,
  }, testInfo) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncEmblem(false);

    const ms = await timeUntil(async () => {
      await setHostProperty(page, logoPage.hostSelector, 'emblem', true);
      await expect(logoPage.logoRoot).toHaveClass(/logo-emblem/, {
        timeout: UPDATE_BUDGET_MS,
      });
    });
    notePerformance(testInfo, 'logo emblem update', ms);
    expectWithinBudget(ms, UPDATE_BUDGET_MS, 'logo emblem update');
  });
});
