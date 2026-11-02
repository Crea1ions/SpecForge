import assert from 'node:assert/strict';
import test from 'node:test';
import YAML from 'yaml';
import { findPreset, PRESETS } from '../engine/presets';
import { BrickRegistry, ProjectSpecification, SpecForge } from './index';
import { UI_UX_DOCS_SITE_DIRECTORY } from './ui-ux/config';
import { parseMarkdownFile } from './static-web/content';

function getPreset(id: string): ProjectSpecification {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  assert.ok(preset, `Expected preset '${id}' to exist`);
  return structuredClone(preset.spec);
}

function assertDeterministicGeneration(spec: ProjectSpecification): ReturnType<typeof SpecForge.generate> {
  const architecture = SpecForge.resolve(spec);
  assert.equal(
    architecture.isValid,
    true,
    architecture.issues.map((issue) => `${issue.id}: ${issue.message}`).join('\n'),
  );

  const first = SpecForge.generate(spec, architecture);
  const second = SpecForge.generate(spec, architecture);
  assert.ok(!first.some((file) => file.path === 'ERROR_GENERATION_BLOCKED.md'));
  assert.equal(SpecForge.computeHash(first), SpecForge.computeHash(second));
  return first;
}

test('Python API Service resolves and generates a deterministic FastAPI scaffold and docs site', () => {
  const spec = getPreset('python-api-service');
  // Site documentaire : option explicite, désactivée par défaut.
  spec.uiUx!.docsSite = true;
  const importedPage = parseMarkdownFile(
    'guides/api-usage.md',
    '# Python API usage\n\nCall the health endpoint before using the service.',
  ).page;
  spec.uiUx!.pages.push(importedPage);

  const files = assertDeterministicGeneration(spec);
  const paths = new Set(files.map((file) => file.path));
  const main = files.find((file) => file.path === 'main.py');
  const api = files.find((file) => file.path === 'api.py');
  const workflow = files.find((file) => file.path === '.github/workflows/ci.yml');
  const openapi = files.find((file) => file.path === 'openapi.yaml');
  const parsedOpenApi = YAML.parse(openapi?.content ?? '');
  const readme = files.find((file) => file.path === 'README.md');

  assert.ok(paths.has('pyproject.toml'));
  assert.ok(paths.has('tests/test_api.py'));
  assert.ok(paths.has('docs-site/index.html'));
  assert.equal(main?.language, 'python');
  assert.equal(api?.language, 'python');
  assert.match(main?.content ?? '', /^import os\n\nimport uvicorn\n/);
  assert.doesNotMatch(main?.content ?? '', /^ {4}(?:import|from|app\.)/m);
  assert.match(main?.content ?? '', /from api import router as api_router/);
  assert.match(api?.content ?? '', /def create_item/);
  assert.match(workflow?.content ?? '', /python -m pip install -e "\.\[dev\]"/);
  assert.match(workflow?.content ?? '', /pytest/);
  assert.doesNotMatch(workflow?.content ?? '', /cargo test/);
  assert.match(readme?.content ?? '', /python -m pip install -e/);
  assert.deepEqual(Object.keys(parsedOpenApi.paths), ['/api/health', '/api/items']);
  assert.match(
    files.find((file) => file.path === `${UI_UX_DOCS_SITE_DIRECTORY}/index.html`)?.content ?? '',
    /Python API usage/,
  );

  const corsSpec = getPreset('python-api-service');
  corsSpec.backend.cors = true;
  const corsMain = assertDeterministicGeneration(corsSpec).find((file) => file.path === 'main.py');
  assert.match(corsMain?.content ?? '', /from fastapi\.middleware\.cors import CORSMiddleware/);
});

test('Go API Service resolves and generates a deterministic net/http scaffold and docs site', () => {
  const spec = getPreset('go-api-service');
  // Site documentaire : option explicite, désactivée par défaut.
  spec.uiUx!.docsSite = true;
  spec.uiUx!.pages.push(
    parseMarkdownFile('guides/api-usage.md', '# Go API usage\n\nStart the service with `go run .`.').page,
  );

  const files = assertDeterministicGeneration(spec);
  const paths = new Set(files.map((file) => file.path));
  const main = files.find((file) => file.path === 'main.go');
  const api = files.find((file) => file.path === 'api.go');
  const workflow = files.find((file) => file.path === '.github/workflows/ci.yml');
  const openapi = YAML.parse(files.find((file) => file.path === 'openapi.yaml')?.content ?? '');
  const readme = files.find((file) => file.path === 'README.md');

  assert.ok(paths.has('go.mod'));
  assert.ok(paths.has('api_test.go'));
  assert.ok(paths.has('docs-site/index.html'));
  assert.equal(main?.language, 'go');
  assert.equal(api?.language, 'go');
  assert.match(main?.content ?? '', /net\/http/);
  assert.match(main?.content ?? '', /log\.Printf\("starting %s on port %s", "go-api-service", port\)/);
  assert.doesNotMatch(main?.content ?? '', /[ \t]+\n/);
  assert.ok(main?.content.endsWith('\n'));
  assert.match(api?.content ?? '', /GET \/api\/health/);
  assert.match(api?.content ?? '', /POST \/api\/items/);
  assert.match(workflow?.content ?? '', /go test \.\/\.\.\./);
  assert.doesNotMatch(workflow?.content ?? '', /cargo test/);
  assert.match(readme?.content ?? '', /go run \./);
  assert.deepEqual(Object.keys(openapi.paths), ['/api/health', '/api/items']);
  assert.match(
    files.find((file) => file.path === `${UI_UX_DOCS_SITE_DIRECTORY}/index.html`)?.content ?? '',
    /Go API usage/,
  );

  const corsSpec = getPreset('go-api-service');
  corsSpec.backend.cors = true;
  const corsMain = assertDeterministicGeneration(corsSpec).find((file) => file.path === 'main.go');
  assert.match(corsMain?.content ?? '', /handler = withCORS\(handler\)/);
  assert.match(corsMain?.content ?? '', /func withCORS\(next http\.Handler\)/);
});

test('TypeScript remains an active React/Vite frontend with frontend-specific CI', () => {
  const preset = findPreset('typescript', 'web-frontend');
  assert.ok(preset);
  const files = assertDeterministicGeneration(structuredClone(preset.spec));
  const workflow = files.find((file) => file.path === '.github/workflows/ci.yml');
  const readme = files.find((file) => file.path === 'README.md');

  assert.ok(files.some((file) => file.path === 'frontend/package.json'));
  assert.match(workflow?.content ?? '', /npm run build/);
  assert.doesNotMatch(workflow?.content ?? '', /cargo test/);
  assert.match(readme?.content ?? '', /npm run dev/);
  assert.equal(findPreset('typescript', 'api-service'), undefined);
});

test('Rust Web App feeds its native Askama interface from the UI/UX configuration', () => {
  const spec = getPreset('rust-web-app');
  spec.uiUx!.pages[0].markdown = '# Configured application home\n\nThis is the UI configured in SpecForge.';
  spec.uiUx!.pages.push({
    id: 'page-guide',
    title: 'Guide',
    slug: 'guide',
    description: 'Page additionnelle configurée.',
    order: 1,
    category: '',
    tags: [],
    markdown: '# Guide\n\nContenu de la page guide.',
    blocks: [],
  });
  spec.uiUx!.theme = { ...spec.uiUx!.theme, preset: 'custom', primary: '#123abc' };

  const files = assertDeterministicGeneration(spec);
  const paths = new Set(files.map((file) => file.path));
  const routes = files.find((file) => file.path === 'src/routes.rs')?.content ?? '';
  const main = files.find((file) => file.path === 'src/main.rs')?.content ?? '';
  const handlers = files.find((file) => file.path === 'src/handlers.rs')?.content ?? '';
  const home = files.find((file) => file.path === 'templates/index.html')?.content ?? '';
  const guide = files.find((file) => file.path === 'templates/pages/guide.html')?.content ?? '';
  const navigation = files.find((file) => file.path === 'templates/components/navigation.html')?.content ?? '';
  const tokens = files.find((file) => file.path === 'static/css/tokens.css')?.content ?? '';

  // Aucun site UI parallèle : les sorties vivent dans l'organisation native.
  assert.ok(![...paths].some((path) => path.includes('ui-site') || path.startsWith('docs-site')));
  // Accueil natif alimenté par la configuration, routes et handlers métier préservés.
  assert.match(routes, /\.route\("\/", get\(handlers::index\)\)/);
  assert.match(routes, /\.route\("\/dashboard", get\(handlers::dashboard\)\)/);
  assert.match(routes, /\.route\("\/guide", get\(handlers::page_guide\)\)/);
  assert.doesNotMatch(routes, /ServeFile|get_service/);
  assert.doesNotMatch(main, /fallback_service/);
  assert.match(handlers, /struct IndexTemplate;/);
  assert.match(handlers, /struct GuideTemplate;/);
  assert.match(handlers, /struct DashboardTemplate/);
  assert.match(home, /Configured application home/);
  assert.match(home, /\{% extends "layout\.html" %\}/);
  assert.match(guide, /Contenu de la page guide\./);
  assert.match(navigation, /<a href="\/guide">Guide<\/a>/);
  assert.match(navigation, /<a href="\/dashboard">Tableau de bord<\/a>/);
  assert.match(tokens, /--color-accent: #123abc/);
});

test('API-only presets do not emit docs-site unless the user opts in explicitly', () => {
  for (const presetId of ['python-api-service', 'go-api-service', 'rust-backend-only']) {
    const spec = getPreset(presetId);
    assert.equal(spec.uiUx?.docsSite, false, `${presetId} doit être désactivé par défaut`);
    const files = assertDeterministicGeneration(spec);
    assert.ok(
      !files.some((file) => file.path.startsWith(`${UI_UX_DOCS_SITE_DIRECTORY}/`)),
      `${presetId} ne doit pas générer docs-site/ sans option explicite`,
    );
  }
});

test('unsupported profile combinations and missing backend bricks fail explicitly', () => {
  const goSpec = getPreset('go-api-service');
  goSpec.backend.framework = 'express';
  const invalidFramework = SpecForge.resolve(goSpec);
  assert.equal(invalidFramework.isValid, false);
  assert.ok(invalidFramework.issues.some((issue) => issue.id === 'unsupported-framework-go-express'));

  const unavailableTemplate = getPreset('go-api-service');
  unavailableTemplate.template = 'web-platform';
  const unsupportedPair = SpecForge.resolve(unavailableTemplate);
  assert.equal(unsupportedPair.isValid, false);
  assert.ok(unsupportedPair.issues.some((issue) => issue.id === 'unsupported-profile-template-go-web-platform'));

  const missingGoBrick = new BrickRegistry();
  missingGoBrick.unregister('go-backend');
  const missingBackend = SpecForge.resolve(getPreset('go-api-service'), missingGoBrick);
  assert.equal(missingBackend.isValid, false);
  assert.ok(missingBackend.issues.some((issue) => issue.id === 'missing-dep-rest-api-backend_runtime'));

  const unsupportedStorage = getPreset('python-api-service');
  unsupportedStorage.database.enabled = true;
  unsupportedStorage.database.type = 'sqlite';
  const missingStorageSupport = SpecForge.resolve(unsupportedStorage);
  assert.equal(missingStorageSupport.isValid, false);
  assert.ok(missingStorageSupport.issues.some((issue) => issue.id === 'unsupported-database-python'));
});
