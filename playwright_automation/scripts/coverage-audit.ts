import fs from 'node:fs';
import { indexTestsForTag } from './lib/spec-index.js';
import { SPECS_DIR, slugFromTag } from './lib/paths.js';

function parsePlanScenarios(planPath: string): Array<{
  id: string;
  action: string;
  automate: string;
  title: string;
}> {
  const text = fs.readFileSync(planPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const inTable = { active: false };
  const rows: Array<{
    id: string;
    action: string;
    automate: string;
    title: string;
  }> = [];

  for (const line of lines) {
    if (line.startsWith('| id |')) {
      inTable.active = true;
      continue;
    }
    if (!inTable.active || !line.startsWith('|')) {
      continue;
    }
    if (line.startsWith('| ---')) {
      continue;
    }
    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 5) {
      continue;
    }
    rows.push({
      id: parts[0],
      action: parts[1],
      automate: parts[2].toLowerCase(),
      title: parts[4],
    });
  }
  return rows;
}

const tagArg = process.argv[2];
if (!tagArg) {
  console.error('Usage: tsx scripts/coverage-audit.ts modus-wc-switch');
  process.exit(2);
}

const slug = slugFromTag(tagArg);
const planPath = `${SPECS_DIR}/${slug}.md`;
if (!fs.existsSync(planPath)) {
  console.error(`Missing plan ${planPath} — run npm run agent:plan`);
  process.exit(2);
}

const planRows = parsePlanScenarios(planPath);
const tests = indexTestsForTag(tagArg);

const planAutomate = planRows.filter(
  (r) =>
    (r.action === 'add' || r.action === 'keep') && r.automate !== 'no'
);
const missing = planAutomate.filter(
  (row) =>
    !tests.some(
      (t) => t.title.includes(row.id) || t.title === row.title
    )
);

const orphans = tests.filter(
  (test) =>
    !planAutomate.some(
      (row) => test.title.includes(row.id) || test.title === row.title
    )
);

console.log(`Audit: ${tagArg}`);
console.log(`Plan scenarios: ${planRows.length}`);
console.log(`Source titles: ${tests.length}`);
console.log(`Missing implementations: ${missing.length}`);
for (const row of missing) {
  console.log(`  - [${row.id}] ${row.title}`);
}
console.log(`Orphan tests (not in plan): ${orphans.length}`);
for (const test of orphans) {
  console.log(`  - ${test.file}: ${test.title}`);
}

if (missing.length > 0) {
  process.exit(1);
}
