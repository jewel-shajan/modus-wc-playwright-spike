import { expect, test } from '@playwright/test';
import { TablePage } from '../../../pages/table.page.js';

test.describe('Table props @master', () => {
  test('should cover public props for table [table-props] @master', async ({
    page,
  }) => {
    const tablePage = new TablePage(page);
    await tablePage.gotoDefault({ hover: true, density: 'compact' });
    await tablePage.syncHover(true);
    await tablePage.syncDensity('compact');

    await expect(tablePage.tableRoot).toHaveClass(/modus-wc-table-density-compact/);
    await expect(tablePage.tableRoot).toHaveClass(/modus-wc-table-hover/);
  });
});
