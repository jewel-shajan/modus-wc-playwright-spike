import { execSync } from 'node:child_process';

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function loadChangedFilePaths(): string[] {
  const pr = process.env.PR_NUMBER;
  if (pr) {
    try {
      return run(`gh pr diff ${pr} --name-only`)
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      // fall through
    }
  }

  const paths = new Set<string>();
  const collect = (cmd: string) => {
    try {
      for (const line of run(cmd).split(/\r?\n/)) {
        if (line) {
          paths.add(line);
        }
      }
    } catch {
      // ignore
    }
  };

  const base = process.env.BASE_SHA ?? 'origin/main';
  collect(`git diff --name-only ${base}...HEAD`);
  collect('git diff --name-only');
  collect('git diff --name-only --cached');

  return [...paths];
}

export interface PrContext {
  number?: string;
  title?: string;
  body?: string;
  url?: string;
  comments: string[];
}

export function loadPrContext(): PrContext {
  const pr = process.env.PR_NUMBER;
  if (!pr) {
    return { comments: [] };
  }

  let title = '';
  let body = '';
  let url = '';
  try {
    const json = run(
      `gh pr view ${pr} --json title,body,url,comments --jq "{title,body,url,comments:[.comments[].body]}"`
    );
    const parsed = JSON.parse(json) as {
      title: string;
      body: string;
      url: string;
      comments: string[];
    };
    title = parsed.title;
    body = parsed.body;
    url = parsed.url;
    return { number: pr, title, body, url, comments: parsed.comments ?? [] };
  } catch {
    return { number: pr, comments: [] };
  }
}

export function parseLinkedIssueNumber(text: string): number | null {
  const patterns = [
    /closes\s+#(\d+)/i,
    /fix(?:es)?\s+#(\d+)/i,
    /resolve(?:s)?\s+#(\d+)/i,
    /#(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }
  return null;
}

export function loadIssueBody(issueNumber: number): string {
  try {
    return run(`gh issue view ${issueNumber} --json body -q .body`);
  } catch {
    return '';
  }
}
