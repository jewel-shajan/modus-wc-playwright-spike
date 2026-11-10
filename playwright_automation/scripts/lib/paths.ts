import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

export const AUTOMATION_ROOT = path.resolve(scriptsDir, '../..');
export const REPO_ROOT = path.resolve(AUTOMATION_ROOT, '..');
export const GRAPH_PATH = path.join(
  REPO_ROOT,
  'docs/component-graph/component-graph.json'
);
export const TESTS_DIR = path.join(AUTOMATION_ROOT, 'tests/components');
export const SPECS_DIR = path.join(AUTOMATION_ROOT, 'specs');
export const AGENT_DIR = path.join(AUTOMATION_ROOT, '.agent');

export function slugFromTag(tag: string): string {
  return tag.replace(/^modus-wc-/, '');
}

export function componentDirFromTag(tag: string): string {
  return path.join(TESTS_DIR, slugFromTag(tag));
}
