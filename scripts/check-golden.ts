import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { PRESETS } from '../src/engine/presets';
import { DEFAULT_BRICKS } from '../src/core/bricks/default-bricks';
import { generateProjectFiles } from '../src/core/generator';

const GOLDEN = 'scripts/golden.json';
const current: Record<string, string> = {
  '_brick-order': createHash('sha256').update(DEFAULT_BRICKS.map((b) => b.id).join(',')).digest('hex'),
};

for (const p of PRESETS as any[]) {
  const h = createHash('sha256');
  for (const f of generateProjectFiles(p.spec) as any[]) {
    h.update(f.path + '\0' + (f.encoding ?? '') + '\0' + String(f.content) + '\0');
  }
  current[p.id] = h.digest('hex');
}

if (process.argv.includes('--write')) {
  writeFileSync(GOLDEN, JSON.stringify(current, null, 2) + '\n');
  console.log('golden écrit :', Object.keys(current).length, 'entrées');
} else {
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf-8'));
  let bad = 0;
  for (const k of Object.keys({ ...golden, ...current })) {
    const ok = golden[k] === current[k];
    if (!ok) bad++;
    console.log(ok ? 'OK  ' : 'DIFF', k);
  }
  process.exit(bad ? 1 : 0);
}
