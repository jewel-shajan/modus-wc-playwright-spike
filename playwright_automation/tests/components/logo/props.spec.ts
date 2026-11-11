import { expect, test } from '@playwright/test';
import {
  CONNECT_EMBLEM_VIEWBOX,
  CONNECT_WORDMARK_VIEWBOX,
  TRIMBLE_ACCENT_FILL,
  TRIMBLE_EMBLEM_VIEWBOX,
  TRIMBLE_WORDMARK_VIEWBOX,
  expectSvgGeometry,
  expectSvgViewBox,
} from '../../../assertions/svg-geometry.js';
import { LogoPage } from '../../../pages/logo.page.js';

test.describe('Logo props @master', () => {
  test('should apply name prop via sync fallback @master', async ({ page }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble' });
    const name = await logoPage.syncName('trimble');
    expect(name).toBe('trimble');
    await expect(logoPage.logoRoot).toHaveClass(/logo-full/);
  });

  test('should switch to emblem class when emblem is true @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: true });
    await logoPage.syncEmblem(true);
    await expect(logoPage.logoRoot).toHaveClass(/logo-emblem/);
  });

  test('should use alt prop for aria-label when provided @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({
      name: 'trimble',
      emblem: false,
      alt: 'Trimble corporate',
    });
    await logoPage.syncProp('alt', 'Trimble corporate');
    expect(await logoPage.getAriaLabel()).toBe('Trimble corporate');
  });

  test('should default aria-label from name when alt omitted @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncName('trimble');
    const label = await logoPage.getAriaLabel();
    expect(label?.toLowerCase()).toContain('trimble');
  });

  test('should assert emblem viewBox 0 0 32 32 not wordmark @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: true });
    await logoPage.syncEmblem(true);
    const svg = logoPage.host.locator('svg').first();
    await expectSvgGeometry(
      page,
      logoPage.hostSelector,
      svg,
      TRIMBLE_EMBLEM_VIEWBOX,
      [TRIMBLE_ACCENT_FILL]
    );
    const viewBox = await svg.getAttribute('viewBox');
    expect(viewBox).not.toBe(TRIMBLE_WORDMARK_VIEWBOX);
  });

  test('should assert wordmark viewBox 0 0 106 32 on combined logo @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'trimble', emblem: false });
    await logoPage.syncEmblem(false);
    const wordmarkSvg = logoPage.host
      .locator('.logo-combined-wordmark svg, .modus-wc-logo.logo-full svg')
      .last();
    await expectSvgGeometry(
      page,
      logoPage.hostSelector,
      wordmarkSvg,
      TRIMBLE_WORDMARK_VIEWBOX,
      [TRIMBLE_ACCENT_FILL]
    );
  });

  test('should load the connect emblem svg and not the wordmark @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'connect', emblem: true });
    await logoPage.syncName('connect');
    await logoPage.syncEmblem(true);
    const svg = logoPage.host.locator('svg').first();
    await expectSvgViewBox(svg, CONNECT_EMBLEM_VIEWBOX);
    const viewBox = await svg.getAttribute('viewBox');
    expect(viewBox).not.toBe(CONNECT_WORDMARK_VIEWBOX);
  });

  test('should render developer_console self-contained wordmark without combined split [tc:LOGO-PROPS-8] @master', async ({
    page,
  }) => {
    const logoPage = new LogoPage(page);
    await logoPage.gotoDefault({ name: 'developer_console', emblem: false });
    await logoPage.syncName('developer_console');
    await expect(logoPage.logoRoot).toHaveClass(/logo-full/);
    await expect(logoPage.logoRoot).not.toHaveClass(/logo-combined/);
    await expect(logoPage.host.locator('.logo-combined-emblem')).toHaveCount(0);
    await expect(logoPage.primarySvg).toBeAttached();
    await expect(logoPage.host.locator('.logo-accent').first()).toBeAttached();
  });
});
