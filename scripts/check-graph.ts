import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { PRESETS } from '../src/engine/presets';
import { resolveArchitecture } from '../src/core/resolver';

const FILE = 'scripts/graph.golden.json';
const FLAGS: [string, string][] = [
  ['infrastructure', 'docker'], ['infrastructure', 'systemd'], ['quality', 'ci'],
  ['documentation', 'readme'], ['documentation', 'workStructure'],
  ['authentication', 'enabled'], ['api', 'openapi'],
];

const snap = (spec: any): any => {
  try {
    const r: any = resolveArchitecture(spec);
    return {
      bricks: r.activeBricks.map((b: any) => b.id),
      nodes: r.nodes.map((n: any) => `${n.id}@${n.layer}`),
      edges: r.edges.map((e: any) => `${e.from}>${e.to}|${e.label}|${e.protocol ?? ''}`),
      issues: r.issues.map((i: any) => `${i.severity}:${i.id}`),
      adrs: r.decisions.map((d: any) => `${d.id}:${d.generatingBrick}`),
    };
  } catch (e: any) {
    return { throws: String(e?.message ?? e) };
  }
};
const short = (o: any) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 12);

const presets: Record<string, any> = {};
const matrix: Record<string, string> = {};
for (const p of PRESETS as any[]) {
  presets[p.id] = snap(p.spec);
  for (const profile of ['rust', 'python', 'typescript', 'go'])
    for (const template of ['web-frontend', 'web-app', 'web-platform', 'api-service', 'desktop', 'mobile'])
      for (const language of ['rust', 'python', 'typescript', 'go'])
        for (const framework of ['react', 'askama', 'none']) {
          const s = { ...p.spec, profile, template, backend: { ...p.spec.backend, language }, frontend: { ...p.spec.frontend, framework } };
          matrix[[p.id, profile, template, language, framework].join('|')] = short(snap(s));
        }
  for (let mask = 0; mask < 1 << FLAGS.length; mask++) {
    const s = JSON.parse(JSON.stringify(p.spec));
    s.quality.tests = false; s.quality.lint = false;
    FLAGS.forEach(([sec, key], i) => { s[sec][key] = !!(mask & (1 << i)); });
    matrix[`${p.id}|flags|${mask}`] = short(snap(s));
  }
}

if (process.argv.includes('--write')) {
  writeFileSync(FILE, JSON.stringify({ presets, matrix }, null, 1) + '\n');
  console.log('snapshot écrit :', Object.keys(presets).length, 'presets,', Object.keys(matrix).length, 'variantes');
} else {
  const g = JSON.parse(readFileSync(FILE, 'utf-8'));
  const bad: string[] = [];
  for (const k of Object.keys(presets)) if (JSON.stringify(g.presets[k]) !== JSON.stringify(presets[k])) bad.push('preset ' + k);
  for (const k of Object.keys(matrix)) if (g.matrix[k] !== matrix[k]) bad.push('variante ' + k);
  bad.slice(0, 20).forEach((k) => console.log('DIFF', k));
  console.log(bad.length ? `${bad.length} écart(s)` : 'OK graphe + issues + ADR identiques');
  process.exit(bad.length ? 1 : 0);
}
