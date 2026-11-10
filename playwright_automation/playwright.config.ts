import { defineConfig, devices } from '@playwright/test';

const storybookBaseUrl =
  process.env.STORYBOOK_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:6006';

const storybookIsRemote = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(
  storybookBaseUrl
);

const skipWebServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1' || storybookIsRemote;

// CI runs build:ci first, so dist/loader already exists. storybook:start would
// start a second Stencil watch on top of that build.
const webServerCommand = process.env.CI
  ? 'npx storybook dev -p 6006 --ci --no-open --exact-port'
  : 'npm run storybook:start';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  grep: /@master/,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports', open: 'never' }],
    ['junit', { outputFile: 'reports/results.xml' }],
  ],
  use: {
    baseURL: storybookBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  outputDir: 'test-results',
  webServer: skipWebServer
    ? undefined
    : {
        command: webServerCommand,
        cwd: '..',
        url: 'http://127.0.0.1:6006',
        reuseExistingServer: !process.env.CI,
        timeout: 480_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
