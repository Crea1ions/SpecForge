import { mkdirSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
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
const finish = (code: number, message: string): never => {
  console.log(message);
  if (code === 0 && !keep) rmSync(dir, { recursive: true, force: true });
  else console.log('Dossier conservé :', dir);
  process.exit(code);
};

for (const f of generateProjectFiles(preset.spec) as any[]) {
  const dest = join(dir, f.path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, f.content);
}

if (!existsSync(join(dir, 'package.json'))) finish(0, 'SKIP : pas de package.json (profil non npm)');

const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: dir, stdio: 'inherit' }).status;
if (run('npm', ['install', '--no-audit', '--no-fund']) !== 0) finish(1, 'FAIL : npm install');
if (run('npx', ['tsc', '--noEmit']) !== 0) finish(1, 'FAIL : tsc --noEmit');
finish(0, `OK : npm install + tsc --noEmit, preset ${id}`);
