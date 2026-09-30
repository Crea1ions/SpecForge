import { deepStrictEqual } from 'assert';
import { PRESETS, findPreset } from '../src/engine/presets';
import * as E from '../src/core/spec-edit';
import { BrickRegistry, defaultRegistry } from '../src/core/registry';

// Verbatim copies of the legacy ProjectWizard logic (returns what was passed to onChange).
const legacyUpdate = (spec: any, key: string, val: any) => {
  const currentValue = spec[key];
  const updatedValue = typeof currentValue === 'object' && currentValue !== null ? { ...currentValue, ...val } : val;
  return { ...spec, [key]: updatedValue };
};
const legacySlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const legacyLang = (s: any, l: string) => legacyUpdate(s, 'backend', { language: l, framework: l === 'rust' ? 'axum' : 'fastapi' });
const legacyDb = (s: any, t: string) => legacyUpdate(s, 'database', { type: t, orm: 'sqlx' });
const legacyAuth = (s: any, c: boolean) => legacyUpdate(s, 'authentication', { enabled: c, provider: c ? 'jwt' : 'none' });
const legacyDocker = (s: any, c: boolean) => legacyUpdate(s, 'infrastructure', { docker: c, compose: c ? s.infrastructure.compose : false });
const legacyTemplate = (spec: any, template: string) => {
  const preset = findPreset(spec.profile, template as any);
  if (!preset) return undefined;
  const newSlug = preset.spec.project.slug;
  const defaultIdentifier =
    spec.project.identifier && !spec.project.identifier.startsWith('com.example.')
      ? spec.project.identifier
      : `com.acme.${newSlug.replace(/[^a-z0-9]/g, '')}`;
  return {
    ...preset.spec,
    project: {
      ...spec.project,
      name: preset.spec.project.name,
      slug: newSlug,
      identifier: template === 'mobile' ? defaultIdentifier : spec.project.identifier,
      description: preset.spec.project.description,
      type: preset.spec.project.type,
    },
  };
};

let n = 0;
const eq = (a: any, b: any, what: string) => {
  try { deepStrictEqual(a, b); n++; } catch { console.log('DIFF', what); process.exitCode = 1; }
};

for (const p of PRESETS as any[]) {
  for (const compose of [true, false]) {
    const base = { ...p.spec, infrastructure: { ...p.spec.infrastructure, compose } };
    const id = `${p.id}|compose=${compose}`;
    for (const s of ['Lexi Core', 'a_b.C', 'ÉTÉ 2', 'x-Y z', '']) eq(E.sanitizeSlug(s), legacySlug(s), `slug ${s}`);
    for (const l of ['rust', 'python']) eq(E.setBackendLanguage(base, l as any), legacyLang(base, l), `${id}|lang ${l}`);
    for (const t of ['sqlite', 'postgresql']) eq(E.setDatabaseType(base, t as any), legacyDb(base, t), `${id}|db ${t}`);
    for (const c of [true, false]) {
      eq(E.setAuthEnabled(base, c), legacyAuth(base, c), `${id}|auth ${c}`);
      eq(E.setDockerEnabled(base, c), legacyDocker(base, c), `${id}|docker ${c}`);
    }
    eq(E.mergeSection(base, 'quality', { tests: true } as any), legacyUpdate(base, 'quality', { tests: true }), `${id}|merge`);
    eq(E.mergeSection(base, 'profile', 'python' as any), legacyUpdate(base, 'profile', 'python'), `${id}|merge scalar`);
    for (const ident of ['', 'com.example.foo', 'org.real.app'])
      for (const t of ['web-frontend', 'web-app', 'web-platform', 'api-service', 'desktop', 'mobile']) {
        const s = { ...base, project: { ...base.project, identifier: ident } };
        const preset = findPreset(s.profile, t as any);
        const legacy = legacyTemplate(s, t);
        if (!preset) { eq(legacy, undefined, `${id}|tpl ${t} absent`); continue; }
        eq(E.applyTemplatePreset(s, t as any, preset), legacy, `${id}|tpl ${t}|${ident}`);
      }
  }
}
// Synthetic preset: slug with digits/symbols (exercises the identifier regex), legacy logic inlined.
const synth: any = { spec: { ...(PRESETS as any[])[0].spec, project: { ...(PRESETS as any[])[0].spec.project, slug: 'app-2_x9', name: 'N', description: 'D', type: 'fullstack' } } };
for (const ident of ['', 'com.example.foo', 'org.real.app'])
  for (const t of ['mobile', 'desktop']) {
    const s0 = { ...(PRESETS as any[])[1].spec, project: { ...(PRESETS as any[])[1].spec.project, identifier: ident } };
    const newSlug = synth.spec.project.slug;
    const defId = s0.project.identifier && !s0.project.identifier.startsWith('com.example.') ? s0.project.identifier : `com.acme.${newSlug.replace(/[^a-z0-9]/g, '')}`;
    const legacy = { ...synth.spec, project: { ...s0.project, name: 'N', slug: newSlug, identifier: t === 'mobile' ? defId : s0.project.identifier, description: 'D', type: 'fullstack' } };
    eq(E.applyTemplatePreset(s0, t as any, synth), legacy, `synth ${t}|${ident}`);
  }
for (const s of ['a-b', 'a b', 'A_B', 'a--b']) eq(E.sanitizeSlug(s), legacySlug(s), `slug2 ${s}`);
// C6b: derivation from the registry (a fake registry declares languages the legacy code never knew).
const fake = new BrickRegistry([
  { id: 'go-backend', backendStack: { language: 'go', frameworks: ['gin', 'echo'] } } as any,
  { id: 'go-backend-2', backendStack: { language: 'go', frameworks: ['fiber'] } } as any,
  { id: 'empty-backend', backendStack: { language: 'typescript', frameworks: [] } } as any,
  { id: 'no-stack' } as any,
]);
const b0: any = (PRESETS as any[])[0].spec;
eq(E.backendStacks(fake), [{ language: 'go', frameworks: ['gin', 'echo'] }, { language: 'typescript', frameworks: [] }], 'stacks fake (first wins, no-stack skipped)');
eq(E.setBackendLanguage(b0, 'go' as any, fake).backend.framework, 'gin', 'fake go default');
eq(E.setBackendLanguage(b0, 'go' as any, fake).backend.language, 'go', 'fake go language');
eq(E.setBackendLanguage(b0, 'typescript' as any, fake).backend.framework, b0.backend.framework, 'empty frameworks keeps current');
eq(E.setBackendLanguage(b0, 'rust' as any, fake).backend.framework, b0.backend.framework, 'undeclared language keeps current');
eq(
  E.backendStacks(defaultRegistry).map((o) => `${o.language}:${o.frameworks.join(',')}`).sort(),
  ['python:fastapi', 'rust:axum'],
  'stacks default registry'
);
const bFw: any = { ...b0, backend: { ...b0.backend, framework: 'fastapi' } };
eq(E.setBackendLanguage(bFw, 'rust' as any, fake).backend.framework, 'fastapi', 'undeclared keeps current (non-axum)');
eq(E.setBackendLanguage(bFw, 'typescript' as any, fake).backend.framework, 'fastapi', 'empty frameworks keeps current (non-axum)');
console.log(process.exitCode ? 'ECHEC' : `OK ${n} comparaisons`);
