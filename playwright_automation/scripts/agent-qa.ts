import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const automationRoot = path.resolve(scriptsDir, '..');

function run(script: string, extra: string[] = []): void {
  const result = spawnSync(
    'npx',
    ['tsx', path.join('scripts', script), ...extra],
    { cwd: automationRoot, stdio: 'inherit', shell: true }
  );
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('resolve-scope.ts');
run('build-plan.ts');
run('run-scoped.ts');
