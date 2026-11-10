import fs from 'node:fs';
import {
  resolveScope,
  tagsFromDiffPaths,
} from './lib/component-graph.js';
import { loadChangedFilePaths } from './lib/git-context.js';
import {
  AGENT_DIR,
  componentDirFromTag,
  slugFromTag,
} from './lib/paths.js';

const includeParents = process.env.PLAYWRIGHT_SCOPE_PARENTS === '1';
const parentCap = Number.parseInt(process.env.PLAYWRIGHT_PARENT_CAP ?? '3', 10);

const changedPaths = loadChangedFilePaths();
const changedTags = tagsFromDiffPaths(changedPaths);
const scope = resolveScope(changedTags, {
  includeParents,
  parentCap: Number.isFinite(parentCap) ? parentCap : 3,
});

const tagged = scope.runTags.map((tag) => ({
  tag,
  slug: slugFromTag(tag),
  hasTests: fs.existsSync(componentDirFromTag(tag)),
}));
const runnableSlugs = tagged.filter((entry) => entry.hasTests);
const missingTestFolders = tagged
  .filter((entry) => !entry.hasTests)
  .map((entry) => entry.tag);

const payload = {
  generatedAt: new Date().toISOString(),
  changedPaths,
  ...scope,
  runnableSlugs: runnableSlugs.map((e) => e.slug),
  runnableTags: runnableSlugs.map((e) => e.tag),
  missingTestFolders,
  fallbackAll: changedTags.length === 0,
};

fs.mkdirSync(AGENT_DIR, { recursive: true });
fs.writeFileSync(
  `${AGENT_DIR}/scope.json`,
  `${JSON.stringify(payload, null, 2)}\n`
);

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
} else {
  console.log('Playwright scope');
  console.log(`Changed tags: ${scope.changedTags.join(', ') || '(none)'}`);
  console.log(`Parent tags (cap ${parentCap}): ${scope.parentTags.join(', ') || '(none)'}`);
  console.log(
    `Compose children: ${scope.composeChildTags.join(', ') || '(none)'}`
  );
  console.log(
    `Runnable suites: ${runnableSlugs.map((e) => e.slug).join(', ') || '(none — run full @master or add specs)'}`
  );
  if (missingTestFolders.length > 0) {
    console.log('No test folder (omitted from the scoped run):');
    for (const tag of missingTestFolders) {
      console.log(`  ${tag}`);
    }
  }
  if (payload.fallbackAll) {
    console.log('No component src changes detected — default is full @master suite.');
  }
}
