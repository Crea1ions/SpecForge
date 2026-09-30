import { PRESETS } from '../src/engine/presets';
import { resolveArchitecture } from '../src/core/resolver';
import { DEFAULT_BRICKS } from '../src/core/bricks/default-bricks';
import { matchesSpec } from '../src/core/match';
import type { BrickDefinition, BrickCategory } from '../src/core/types';

const selectByData = (spec: any): string[] => {
  const candidates = DEFAULT_BRICKS.filter(
    (b) => b.applies?.some((p) => matchesSpec(spec, p)),
  );
  const subsumedCategories = new Set<BrickCategory>();
  candidates.forEach((b) => b.subsumes?.forEach((c) => subsumedCategories.add(c)));
  return candidates
    .filter((b) => {
      const selfSubsumes = b.subsumes?.includes(b.category);
      return selfSubsumes || !subsumedCategories.has(b.category);
    })
    .map((b) => b.id);
};

let bad = 0, total = 0;
for (const p of PRESETS as any[]) {
  for (const profile of ['rust', 'python', 'typescript', 'go'])
    for (const template of ['web-frontend', 'web-app', 'web-platform', 'api-service', 'desktop', 'mobile'])
      for (const language of ['rust', 'python', 'typescript', 'go'])
        for (const framework of ['react', 'askama', 'none']) {
          total++;
          const spec = { ...p.spec, profile, template, backend: { ...p.spec.backend, language }, frontend: { ...p.spec.frontend, framework } };
          const expected = new Set(resolveArchitecture(spec).activeBricks.map((b: any) => b.id));
          const actual = new Set(selectByData(spec));
          const missing = [...expected].filter((x) => !actual.has(x));
          const extra = [...actual].filter((x) => !expected.has(x));
          if (missing.length || extra.length) {
            bad++;
            if (bad <= 15) console.log('DIFF', p.id, profile, template, language, framework, { missing, extra });
          }
        }
}
console.log(bad ? `${bad}/${total} écart(s)` : `OK ${total} sélections identiques`);
process.exit(bad ? 1 : 0);
