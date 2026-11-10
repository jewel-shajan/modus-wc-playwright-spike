import fs from 'node:fs';
import path from 'node:path';
import { SPECS_DIR, componentDirFromTag, slugFromTag } from './lib/paths.js';

const dryRun = !process.argv.includes('--write');

function parsePlan(planPath: string): {
  status: string;
  removes: Array<{ id: string; title: string }>;
  adds: Array<{ id: string; title: string; automate: boolean }>;
} {
  const text = fs.readFileSync(planPath, 'utf8');
  const statusMatch = /Status:\s*\*\*(READY|DRAFT|NEED CLARIFICATION)\*\*/.exec(
    text
  );
  const status = statusMatch?.[1] ?? 'DRAFT';

  const removes: Array<{ id: string; title: string }> = [];
  const adds: Array<{ id: string; title: string; automate: boolean }> = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|') || line.startsWith('| ---') || line.startsWith('| id')) {
      continue;
    }
    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 5) {
      continue;
    }
    const [id, action, automate, , title] = parts;
    if (action === 'remove') {
      removes.push({ id, title });
    }
    if (action === 'add' && automate.toLowerCase() !== 'no') {
      adds.push({ id, title, automate: true });
    }
  }

  return { status, removes, adds };
}

function removeTestsById(dir: string, scenarioId: string): string[] {
  const changed: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.spec.ts')) {
      continue;
    }
    const filePath = path.join(dir, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const blocks = original.split(/(?=test\()/);
    const kept = blocks.filter((block) => {
      if (!block.startsWith('test(')) {
        return true;
      }
      return !block.includes(scenarioId);
    });
  const next = kept.join('');
    if (next !== original) {
      changed.push(filePath);
      if (!dryRun) {
        fs.writeFileSync(filePath, next);
      }
    }
  }
  return changed;
}

function addStub(dir: string, title: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const stubFile = path.join(dir, 'plan-stubs.spec.ts');
  const block = `import { test } from '@playwright/test';

test.describe('Plan stubs @master', () => {
  test.skip('${title.replace(/'/g, "\\'")}', async () => {
    // Implement from specs plan then remove .skip
  });
});
`;
  if (fs.existsSync(stubFile)) {
    const current = fs.readFileSync(stubFile, 'utf8');
    if (current.includes(title)) {
      return;
    }
    if (!dryRun) {
      fs.appendFileSync(
        stubFile,
        `\ntest.skip('${title.replace(/'/g, "\\'")}', async () => {});\n`
      );
    }
  } else if (!dryRun) {
    fs.writeFileSync(stubFile, block);
  }
}

const tag = process.argv.find((a) => a.startsWith('modus-wc-'));
if (!tag) {
  console.error(
    'Usage: tsx scripts/apply-plan.ts modus-wc-switch [--write]'
  );
  process.exit(2);
}

const planPath = path.join(SPECS_DIR, `${slugFromTag(tag)}.md`);
if (!fs.existsSync(planPath)) {
  console.error(`Missing ${planPath}`);
  process.exit(2);
}

const plan = parsePlan(planPath);
if (plan.status !== 'READY') {
  console.error(
    `Plan status is ${plan.status}. Set Status: **READY** before apply.`
  );
  process.exit(2);
}

const dir = componentDirFromTag(tag);
const removedFiles: string[] = [];
for (const row of plan.removes) {
  removedFiles.push(...removeTestsById(dir, row.id));
}

for (const row of plan.adds) {
  const alreadyInSpecs = fs.existsSync(dir);
  if (!alreadyInSpecs) {
    console.log(`No test dir for ${tag}; stub only.`);
  }
  addStub(dir, row.title);
}

console.log(
  dryRun
    ? 'Dry run (pass --write to change files)'
    : 'Applied plan changes'
);
console.log(`Removed blocks touching ids: ${plan.removes.length}`);
console.log(`Stub adds: ${plan.adds.length}`);
if (removedFiles.length > 0) {
  console.log(removedFiles.join('\n'));
}
