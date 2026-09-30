import { matchesSpec } from '../src/core/match';

const spec: any = {
  profile: 'rust',
  template: 'web-app',
  backend: { enabled: true, language: 'rust' },
  frontend: { enabled: false, framework: 'askama' },
};

const cases: [string, any, boolean][] = [
  ['empty pattern matches', {}, true],
  ['scalar equal', { profile: 'rust' }, true],
  ['scalar different', { profile: 'python' }, false],
  ['OR contains', { profile: ['python', 'rust'] }, true],
  ['OR lacks', { profile: ['python', 'go'] }, false],
  ['empty OR matches nothing', { profile: [] }, false],
  ['AND both hold', { backend: { enabled: true, language: 'rust' } }, true],
  ['AND one fails', { backend: { enabled: true, language: 'python' } }, false],
  ['AND across sections', { profile: 'rust', frontend: { framework: 'askama' } }, true],
  ['AND across sections fails', { profile: 'rust', frontend: { framework: 'react' } }, false],
  ['nested OR', { frontend: { framework: ['react', 'askama'] } }, true],
  ['undefined key unconstrained', { profile: undefined }, true],
  ['missing section fails', { database: { enabled: true } }, false],
  ['false is a value', { frontend: { enabled: false } }, true],
];

let bad = 0;
for (const [name, pattern, expected] of cases) {
  const ok = matchesSpec(spec, pattern) === expected;
  if (!ok) bad++;
  console.log(ok ? 'OK  ' : 'FAIL', name);
}
console.log(bad ? `${bad} échec(s)` : `OK ${cases.length} cas`);
process.exit(bad ? 1 : 0);
