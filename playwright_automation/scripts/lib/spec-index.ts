import fs from 'node:fs';
import path from 'node:path';
import { componentDirFromTag } from './paths.js';

export interface IndexedTest {
  file: string;
  title: string;
  hasMasterTag: boolean;
}

export function indexTestsForTag(tag: string): IndexedTest[] {
  const dir = componentDirFromTag(tag);
  if (!fs.existsSync(dir)) {
    return [];
  }

  const tests: IndexedTest[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.spec.ts')) {
      continue;
    }
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const titleRe = /test\(\s*['"`]([^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;
    while ((match = titleRe.exec(content)) !== null) {
      const title = match[1];
      tests.push({
        file,
        title,
        hasMasterTag: title.includes('@master'),
      });
    }
  }
  return tests;
}

export function collectScenarioIdsFromTests(tests: IndexedTest[]): string[] {
  const ids = new Set<string>();
  const idRe = /\[(?:sheet:|tc:)?([A-Za-z0-9._-]+)\]/;
  for (const test of tests) {
    const match = idRe.exec(test.title);
    if (match) {
      ids.add(match[1]);
    }
  }
  return [...ids];
}
