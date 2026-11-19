import { test } from '@playwright/test';
import { runAxeOnStory } from '../../../fixtures/a11y.js';
import { TablePage } from '../../../pages/table.page.js';

test.describe('Table accessibility @master', () => {
  test('should pass axe on interactive state for table [table-a11y] @master', async ({
    page,
  }) => {
    const tablePage = new TablePage(page);
    await tablePage.gotoDefault();
    await runAxeOnStory(page, { context: tablePage.hostSelector });
  });
});
