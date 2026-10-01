import { mkdirSync, writeFileSync, existsSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { PRESETS } from '../src/engine/presets';
import { generateProjectFiles } from '../src/core/generator';

const id = process.argv[2];
const keep = process.argv.includes('--keep');
const preset: any = (PRESETS as any[]).find((p) => p.id === id);
if (!preset) {
  console.error('Preset inconnu :', id, '| disponibles :', (PRESETS as any[]).map((p) => p.id).join(', '));
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), `specforge-${id}-`));
for (const f of generateProjectFiles(preset.spec) as any[]) {
  const dest = join(dir, f.path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, f.content);
}
console.log('Généré dans', dir);

if (!existsSync(join(dir, 'package.json'))) {
  console.log('SKIP : pas de package.json (profil non npm)');
  process.exit(0);
}

const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: dir, stdio: 'inherit' }).status;
if (run('npm', ['install', '--no-audit', '--no-fund']) !== 0) { console.log('FAIL : npm install'); process.exit(1); }
if (run('npx', ['tsc', '--noEmit']) !== 0) { console.log('FAIL : tsc --noEmit'); process.exit(1); }
console.log('OK : npm install + tsc --noEmit, preset', id);