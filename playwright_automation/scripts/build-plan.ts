import fs from 'node:fs';
import {
  composeChildren,
  loadGraph,
  parentDependents,
} from './lib/component-graph.js';
import {
  loadIssueBody,
  loadPrContext,
  parseLinkedIssueNumber,
} from './lib/git-context.js';
import {
  loadMasterSheet,
  sheetRowsForTag,
  type SheetRow,
} from './lib/master-sheet.js';
import {
  indexTestsForTag,
  type IndexedTest,
} from './lib/spec-index.js';
import { AGENT_DIR, REPO_ROOT, SPECS_DIR, slugFromTag } from './lib/paths.js';

const graph = loadGraph();
const pr = loadPrContext();
const issueNo =
  parseLinkedIssueNumber(pr.body ?? '') ??
  parseLinkedIssueNumber(pr.comments.join('\n'));

const issueBody = issueNo ? loadIssueBody(issueNo) : '';
const sheetPath =
  process.env.MASTER_SHEET_CSV ??
  `${REPO_ROOT}/playwright_automation/.agent/master-sheet.csv`;
const sheetRows = loadMasterSheet(sheetPath);

const scopePath = `${AGENT_DIR}/scope.json`;
if (!fs.existsSync(scopePath)) {
  console.error('Missing .agent/scope.json — run: npm run agent:scope');
  process.exit(2);
}

const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8')) as {
  changedTags: string[];
  runTags: string[];
};

type PlanAction = 'keep' | 'add' | 'remove' | 'manual';

interface PlanScenario {
  id: string;
  action: PlanAction;
  automate: boolean;
  title: string;
  source: string;
}

function defaultArchetypeScenarios(tag: string): PlanScenario[] {
  const slug = slugFromTag(tag);
  return [
    {
      id: `${slug.toUpperCase()}-STORIES`,
      action: 'add',
      automate: true,
      title: `should cover default stories for ${slug} [${slug}-stories] @master`,
      source: 'archetype',
    },
    {
      id: `${slug.toUpperCase()}-PROPS`,
      action: 'add',
      automate: true,
      title: `should cover public props for ${slug} [${slug}-props] @master`,
      source: 'archetype',
    },
    {
      id: `${slug.toUpperCase()}-A11Y`,
      action: 'add',
      automate: true,
      title: `should pass axe on interactive state for ${slug} [${slug}-a11y] @master`,
      source: 'archetype',
    },
  ];
}

function sheetToScenarios(rows: SheetRow[]): PlanScenario[] {
  return rows.map((row) => ({
    id: row.scenarioId,
    action: row.automate ? 'add' : 'manual',
    automate: row.automate,
    title: row.automate
      ? row.title.includes('@master')
        ? row.title
        : `${row.title} [sheet:${row.scenarioId}] @master`
      : row.title,
    source: 'master-sheet',
  }));
}

/** Plans the tests already on disk when the master sheet is absent. */
function existingToScenarios(tag: string, tests: IndexedTest[]): PlanScenario[] {
  const slug = slugFromTag(tag).toUpperCase();
  const seen = new Map<string, number>();
  return tests.map((test) => {
    const fromTitle = /\[(?:sheet:|tc:)?([A-Za-z0-9._-]+)\]/.exec(test.title);
    const stem = test.file.replace(/\.spec\.ts$/, '').toUpperCase();
    const n = (seen.get(stem) ?? 0) + 1;
    seen.set(stem, n);
    return {
      id: fromTitle?.[1] ?? `${slug}-${stem}-${n}`,
      action: 'keep' as const,
      automate: true,
      title: test.title,
      source: `existing:${test.file}`,
    };
  });
}

function reconcileWithExisting(
  tag: string,
  scenarios: PlanScenario[]
): PlanScenario[] {
  const existing = indexTestsForTag(tag);
  const existingTitles = new Set(existing.map((t) => t.title));

  return scenarios.map((scenario) => {
    if (scenario.action === 'manual') {
      return scenario;
    }
    const match = existing.find((t) => t.title.includes(scenario.id));
    if (match || existingTitles.has(scenario.title)) {
      return { ...scenario, action: 'keep' };
    }
    return scenario;
  });
}

function buildPlanMarkdown(tag: string, scenarios: PlanScenario[]): string {
  const slug = slugFromTag(tag);
  const parents = parentDependents(graph, tag);
  const children = composeChildren(graph, tag);
  const conflicts: string[] = [];

  if (!fs.existsSync(`${SPECS_DIR}/${slug}.md`)) {
    // no conflict
  }

  const addCount = scenarios.filter((s) => s.action === 'add' && s.automate).length;
  const removeCount = scenarios.filter((s) => s.action === 'remove').length;
  const status =
    conflicts.length > 0
      ? 'NEED CLARIFICATION'
      : addCount + removeCount > 0
        ? 'DRAFT'
        : 'READY';

  const lines: string[] = [
    `# ${tag}`,
    '',
    `Status: **${status}**`,
    '',
    '## Sources',
    `- PR: ${pr.url ?? 'n/a'} ${pr.title ?? ''}`.trim(),
    `- Issue: ${issueNo ? `#${issueNo}` : 'n/a'}`,
    `- Master sheet: ${sheetRows.length > 0 ? sheetPath : 'not loaded (set MASTER_SHEET_CSV or export to .agent/master-sheet.csv)'}`,
    '',
    '## Graph scope',
    `- Changed tag: ${tag}`,
    `- reverseImpact parents: ${parents.join(', ') || 'none'}`,
    `- compose/slot/hosts children: ${children.join(', ') || 'none'}`,
    '',
    '## PR context',
    '```',
    (pr.body ?? '').slice(0, 4000),
    '```',
    '',
    '## Issue context',
    '```',
    issueBody.slice(0, 4000),
    '```',
    '',
    '## Scenarios',
    '| id | action | automate | source | title |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const scenario of scenarios) {
    lines.push(
      `| ${scenario.id} | ${scenario.action} | ${scenario.automate ? 'yes' : 'no'} | ${scenario.source} | ${scenario.title.replace(/\|/g, '\\|')} |`
    );
  }

  if (conflicts.length > 0) {
    lines.push('', '## Conflicts', ...conflicts.map((c) => `- ${c}`));
  }

  lines.push(
    '',
    '## Agent gates',
    '- Set `Status: **READY**` after QA edits scenarios.',
    '- Run `npm run agent:apply` to add stubs / apply removals from `remove` rows.',
    '- Use Cursor **playwright-pr-orchestrator** skill to implement `add` rows as real tests.',
    ''
  );

  return lines.join('\n');
}

fs.mkdirSync(SPECS_DIR, { recursive: true });

const tagsToPlan =
  (scope.changedTags as string[]).length > 0
    ? (scope.changedTags as string[])
    : (scope.runTags as string[]);

if (tagsToPlan.length === 0) {
  console.log('No tags to plan; exiting without writing specs.');
  process.exit(0);
}

for (const tag of tagsToPlan) {
  const sheet = sheetRowsForTag(sheetRows, tag);
  const existing = indexTestsForTag(tag);
  let scenarios: PlanScenario[];
  if (sheet.length > 0) {
    scenarios = reconcileWithExisting(tag, sheetToScenarios(sheet));
  } else if (existing.length > 0) {
    scenarios = existingToScenarios(tag, existing);
  } else {
    scenarios = defaultArchetypeScenarios(tag);
  }

  const markdown = buildPlanMarkdown(tag, scenarios);
  const slug = slugFromTag(tag);
  fs.writeFileSync(`${SPECS_DIR}/${slug}.md`, markdown);
  console.log(`Wrote specs/${slug}.md (${scenarios.length} scenarios)`);
}
