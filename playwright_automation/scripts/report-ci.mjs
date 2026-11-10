/**
 * Builds the pull-request comment for the QA Playwright workflow.
 * The workflow runs the copy of this file from the default branch with system Node.
 */

import fs from 'node:fs';

function flag(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return '';
  }
  return args[index + 1];
}

function readOptional(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8').trim();
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(source, name) {
  const match = new RegExp(`${name}="([^"]*)"`).exec(source);
  return match ? decodeXml(match[1]) : '';
}

function clip(text, max) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n\n[truncated]`;
}

function cell(value) {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function tail(text, lines) {
  const all = text.split(/\r?\n/);
  return all.slice(-lines).join('\n').trim();
}

function parseJunit(xml) {
  const rows = [];
  const casePattern = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match = casePattern.exec(xml);
  while (match) {
    const body = match[2] ?? '';
    const failure = /<(?:failure|error)\b([^>]*)>([\s\S]*?)<\/(?:failure|error)>/.exec(
      body
    );
    const selfClosed = /<(?:failure|error)\b([^>]*)\/>/.exec(body);
    if (failure || selfClosed) {
      const failAttrs = failure?.[1] ?? selfClosed?.[1] ?? '';
      const failBody = failure?.[2] ?? '';
      const message = attr(failAttrs, 'message') || decodeXml(failBody).trim();
      rows.push({
        suite: attr(match[1], 'classname') || attr(match[1], 'file') || '(suite)',
        name: attr(match[1], 'name') || '(test)',
        message,
      });
    }
    match = casePattern.exec(xml);
  }

  const tests = sumAttr(xml, 'testsuite', 'tests');
  const failures = sumAttr(xml, 'testsuite', 'failures');
  const skipped = sumAttr(xml, 'testsuite', 'skipped');
  return { tests, failures, skipped, rows };
}

function sumAttr(xml, tag, name) {
  const pattern = new RegExp(`<${tag}\\b([^>]*)>`, 'g');
  let total = 0;
  let found = false;
  let match = pattern.exec(xml);
  while (match) {
    const value = attr(match[1], name);
    if (value) {
      found = true;
      total += Number.parseInt(value, 10) || 0;
    }
    match = pattern.exec(xml);
  }
  return found ? total : 0;
}

function loadScope(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function list(values) {
  if (!values || values.length === 0) {
    return 'none';
  }
  return values.map((value) => `\`${value}\``).join(', ');
}

function runUrl() {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!server || !repo || !runId) {
    return '';
  }
  return `${server}/${repo}/actions/runs/${runId}`;
}

function buildComment(options) {
  const skips = readOptional(options.skips);
  let result = options.result || 'failure';
  if (result === 'success' && skips) {
    result = 'failure';
  }

  const passed = result === 'success';
  const lines = [
    passed ? '## QA Playwright PASSED' : '## QA Playwright FAILED',
    '',
  ];

  if (passed) {
    lines.push(
      'Graph-scoped Playwright passed on this commit. The pull request can merge once branch protection sees the `qa-playwright` status green on the latest commit.',
      ''
    );
  } else if (result === 'sync-failed') {
    lines.push(
      'The QA sync did not finish, so the graph-scoped suite was not treated as verified. This commit stays blocked.',
      ''
    );
  } else {
    lines.push(
      'Graph-scoped Playwright did not pass. This commit stays blocked until a later ready-for-QA run is green on the latest commit.',
      ''
    );
  }

  const scope = loadScope(options.scope);
  lines.push('### Scope', '');
  if (!scope) {
    lines.push('No scope file was produced, so the graph filter was not recorded.', '');
  } else {
    lines.push(`- Changed tags: ${list(scope.changedTags)}`);
    lines.push(`- Parent tags in the run (cap 3): ${list(scope.parentTags)}`);
    lines.push(
      `- Compose children listed from the graph: ${list(scope.composeChildTags)}`
    );
    lines.push(
      `- Suites executed: ${
        scope.fallbackAll
          ? 'full @master suite (no component files in the diff)'
          : list(scope.runnableSlugs)
      }`
    );
    lines.push('');
  }

  const changed = readOptional(options.changed);
  lines.push('### Test files written by the sync', '');
  if (!changed) {
    lines.push('No Playwright files changed.', '');
  } else {
    for (const file of changed.split(/\r?\n/).filter(Boolean)) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  const notes = readOptional(options.notes);
  if (notes) {
    lines.push('### Sync notes', '', clip(notes, 4000), '');
  }

  const block = readOptional(options.block);
  if (block) {
    lines.push('### Sync blocked', '', clip(block, 2000), '');
  }

  if (skips) {
    lines.push(
      '### Skipped tests added',
      '',
      'The sync added `test.skip`. Those rows do not count as coverage, so this run is failed.',
      '',
      '```',
      clip(skips, 2000),
      '```',
      ''
    );
  }

  if (options.junit && fs.existsSync(options.junit)) {
    const parsed = parseJunit(fs.readFileSync(options.junit, 'utf8'));
    lines.push(
      '### Playwright',
      '',
      `- Tests: ${parsed.tests}`,
      `- Failures: ${parsed.failures || parsed.rows.length}`,
      `- Skipped: ${parsed.skipped}`,
      ''
    );
    if (parsed.rows.length === 0 && !passed) {
      lines.push('The JUnit report has no failure rows.', '');
    }
    if (parsed.rows.length > 0) {
      lines.push('| Suite | Test | Error |', '| --- | --- | --- |');
      const shown = parsed.rows.slice(0, 15);
      for (const row of shown) {
        lines.push(`| ${cell(row.suite)} | ${cell(row.name)} | ${cell(row.message)} |`);
      }
      if (parsed.rows.length > shown.length) {
        lines.push('', `And ${parsed.rows.length - shown.length} more failures.`, '');
      } else {
        lines.push('');
      }
    }
  } else if (!passed && result !== 'sync-failed') {
    lines.push(
      '### Playwright',
      '',
      'Playwright did not write `reports/results.xml`. The run failed before a test report existed (install, build, Storybook startup, or the test process).',
      ''
    );
  }

  const log = readOptional(options.agentLog);
  if (log && result === 'sync-failed') {
    lines.push('### Cursor CLI log (tail)', '', '```', clip(tail(log, 40), 2500), '```', '');
  }

  const url = runUrl();
  if (url) {
    lines.push(
      '### Artifacts',
      '',
      `- Actions run: ${url}`,
      '- HTML report and traces: artifact `qa-playwright-report` on that run (when tests executed).',
      '- Sync log: artifact `qa-sync` on that run.',
      ''
    );
  }

  lines.push(
    'This workflow does not merge. A new push is unverified until QA starts this check again on that commit.'
  );

  return clip(lines.join('\n'), 50000);
}

function main() {
  const args = process.argv.slice(2);
  const out = flag(args, '--out');
  if (!out) {
    console.error('Missing --out');
    process.exit(2);
  }

  const markdown = buildComment({
    result: flag(args, '--result'),
    junit: flag(args, '--junit'),
    scope: flag(args, '--scope'),
    notes: flag(args, '--notes'),
    skips: flag(args, '--skips'),
    block: flag(args, '--block'),
    changed: flag(args, '--changed'),
    agentLog: flag(args, '--agent-log'),
  });

  fs.writeFileSync(out, `${markdown}\n`);
  process.stdout.write(markdown);
}

main();
