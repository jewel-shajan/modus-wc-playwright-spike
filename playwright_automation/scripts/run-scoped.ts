import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AGENT_DIR, TESTS_DIR } from './lib/paths.js';

const scopePath = path.join(AGENT_DIR, 'scope.json');
const project = process.env.PLAYWRIGHT_PROJECT ?? 'chromium';

let args = ['playwright', 'test', `--project=${project}`];

if (fs.existsSync(scopePath)) {
  const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8')) as {
    fallbackAll?: boolean;
    runnableSlugs?: string[];
    missingTestFolders?: unknown;
  };

  const missing = Array.isArray(scope.missingTestFolders)
    ? scope.missingTestFolders.filter((tag) => typeof tag === 'string')
    : [];

  if (!scope.fallbackAll && scope.runnableSlugs && scope.runnableSlugs.length > 0) {
    for (const slug of scope.runnableSlugs) {
      // Playwright treats CLI args as regexes. A Windows path turns `\t` in
      // `tests` into a tab, so the filter matches nothing.
      const folder = path
        .relative(path.dirname(AGENT_DIR), path.join(TESTS_DIR, slug))
        .split(path.sep)
        .join('/');
      args.push(folder);
    }
    console.log(`Scoped run: ${scope.runnableSlugs.join(', ')}`);
    if (missing.length > 0) {
      console.log(`Omitted (no test folder): ${missing.join(', ')}`);
    }
  } else if (!scope.fallbackAll && missing.length > 0) {
    console.log(
      `No runnable suite. No test folder: ${missing.join(', ')}. Full @master suite.`
    );
  } else {
    console.log('Full @master suite (no component-scoped diff).');
  }
} else {
  console.log('No scope file — full @master suite.');
}

const extra = process.argv.slice(2);
args = args.concat(extra);

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.dirname(AGENT_DIR),
});

process.exit(result.status ?? 1);
