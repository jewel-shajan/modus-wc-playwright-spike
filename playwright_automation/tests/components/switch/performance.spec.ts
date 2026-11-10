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
import { SwitchPage } from '../../../pages/switch.page.js';

test.describe('Switch performance @master', () => {
  test('should show the default story within the ready budget @master', async ({
    page,
  }, testInfo) => {
    const switchPage = new SwitchPage(page);
    const ms = await timeStoryReady(() =>
      switchPage.gotoDefault({ value: true, disabled: false })
    );
    notePerformance(testInfo, 'switch story ready', ms);
    await expect(switchPage.switchInput).toBeChecked();
    expectWithinBudget(ms, STORY_READY_BUDGET_MS, 'switch story ready');
  });

  test('should apply a value change within the update budget @master', async ({
    page,
  }, testInfo) => {
    const switchPage = new SwitchPage(page);
    await switchPage.gotoDefault({ value: true, disabled: false });
    await switchPage.syncValue(true);

    const ms = await timeUntil(async () => {
      await setHostProperty(page, switchPage.hostSelector, 'value', false);
      // A false boolean removes aria-checked. The rendered signal is unchecked.
      await expect(switchPage.switchInput).not.toBeChecked({
        timeout: UPDATE_BUDGET_MS,
      });
    });
    notePerformance(testInfo, 'switch value update', ms);
    expectWithinBudget(ms, UPDATE_BUDGET_MS, 'switch value update');
  });
});
