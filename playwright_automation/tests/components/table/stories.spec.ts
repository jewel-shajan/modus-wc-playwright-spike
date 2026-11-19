import { expect, test } from '@playwright/test';
import { TablePage } from '../../../pages/table.page.js';

test.describe('Table stories @master', () => {
  test('should cover default stories for table [table-stories] @master', async ({
    page,
  }) => {
    const tablePage = new TablePage(page);
    await tablePage.gotoDefault();
    await expect(tablePage.host).toBeAttached();
    await expect(tablePage.tableRoot).toBeVisible();
    await expect(tablePage.headerCells.first()).toBeVisible();
    await expect(tablePage.bodyRows.first()).toBeVisible();
  });
});
