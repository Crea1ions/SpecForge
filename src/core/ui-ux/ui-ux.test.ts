/**
 * SpecForge Core — Tests du système de bricks UI/UX des templates applicatifs
 *
 * Couvre : configuration commune, validation dédiée (option docs-site,
 * implémentations manquantes), génération native sans site parallèle, preview
 * par cible et non-régression des comportements métier des templates.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESETS } from '../../engine/presets';
import { ProjectSpecification, ProjectUiUxConfig } from '../types';
import { SpecForge } from '../index';
import { UI_UX_DOCS_SITE_DIRECTORY, createDefaultProjectUiUxConfig } from './config';
import { validateProjectUiUxConfig } from './bricks';
import { resolveUiUxRenderTarget, isApiOnlyUiUxTemplate } from './registry';
import { parseMarkdownFile } from '../static-web/content';
import { renderProjectUiUxPreview } from './preview';
import { renderAskamaUiUxPreview } from './implementations/askama';
import { renderReactUiUxPreview } from './implementations/react';
import { renderDioxusUiUxPreview } from './implementations/dioxus';

function getPreset(id: string): ProjectSpecification {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  assert.ok(preset, `Expected preset '${id}' to exist`);
  return structuredClone(preset.spec);
}

test('every non-Static-Web preset exposes a UI/UX configuration with docsSite off by default', () => {
  const presets = PRESETS.filter((preset) => preset.spec.profile !== 'static-web');
  assert.equal(presets.length, 10);

  for (const preset of presets) {
    const uiUx = preset.spec.uiUx;
    assert.ok(uiUx, `${preset.name} should have UI/UX configuration`);
    assert.equal(uiUx.docsSite, false, `${preset.name} should not emit docs-site by default`);
    const architecture = SpecForge.resolve(preset.spec);
    assert.equal(architecture.isValid, true, `${preset.name} should remain valid`);
  }
});

test('templates with a native UI generate native interface files and no parallel HTML site', () => {
  const expectations: Record<string, { file: string; marker: RegExp }> = {
    'rust-web-app': { file: 'templates/index.html', marker: /\{% extends "layout\.html" %\}/ },
    // Le layout de rust-web-frontend n'est pas héritable : documents autonomes.
    'rust-web-frontend': { file: 'templates/index.html', marker: /class="shell"/ },
    'rust-react-postgres': { file: 'frontend/src/App.tsx', marker: /export default function App/ },
    'react-frontend-only': { file: 'frontend/src/App.tsx', marker: /export default function App/ },
    'rust-tauri-react': { file: 'frontend/src/App.tsx', marker: /export default function App/ },
    'rust-dioxus-mobile': { file: 'src/main.rs', marker: /dioxus::launch/ },
  };

  for (const [presetId, expectation] of Object.entries(expectations)) {
    const spec = getPreset(presetId);
    spec.uiUx!.pages[0].markdown = '# Accueil configuré\n\nContenu issu de SpecForge.';
    const architecture = SpecForge.resolve(spec);
    assert.equal(architecture.isValid, true, `${presetId} should resolve`);
    const first = SpecForge.generate(spec, architecture);
    const second = SpecForge.generate(spec, architecture);
    assert.equal(SpecForge.computeHash(first), SpecForge.computeHash(second), `${presetId} deterministic`);

    const paths = first.map((file) => file.path);
    assert.ok(
      !paths.some((path) => path.includes('ui-site') || path.startsWith(`${UI_UX_DOCS_SITE_DIRECTORY}/`)),
      `${presetId} must not emit a parallel UI site`,
    );
    const native = first.find((file) => file.path === expectation.file);
    assert.ok(native, `${presetId} should generate ${expectation.file}`);
    assert.match(native.content, expectation.marker);
    assert.match(native.content, /Accueil configuré|Contenu issu de SpecForge/);
  }
});

test('imported Markdown pages become native routes and navigation entries in rust-web-app', () => {
  const spec = getPreset('rust-web-app');
  spec.uiUx!.pages.push(
    parseMarkdownFile('guides/installation.md', '# Installation\n\nInstallez les dépendances.', 1).page,
  );

  const files = SpecForge.generate(spec);
  const routes = files.find((file) => file.path === 'src/routes.rs')?.content ?? '';
  const navigation = files.find((file) => file.path === 'templates/components/navigation.html')?.content ?? '';
  const page = files.find((file) => file.path === 'templates/pages/installation.html');

  assert.match(routes, /\.route\("\/installation", get\(handlers::page_installation\)\)/);
  assert.match(navigation, /<a href="\/installation">Installation<\/a>/);
  assert.ok(page);
  assert.match(page.content, /Installez les dépendances\./);
});

test('docs-site is generated only for API-only templates with the explicit option', () => {
  const apiOnly = getPreset('python-api-service');
  apiOnly.uiUx!.docsSite = true;
  const files = SpecForge.generate(apiOnly);
  assert.ok(files.some((file) => file.path === `${UI_UX_DOCS_SITE_DIRECTORY}/index.html`));

  const withoutOption = SpecForge.generate(getPreset('python-api-service'));
  assert.ok(!withoutOption.some((file) => file.path.startsWith(`${UI_UX_DOCS_SITE_DIRECTORY}/`)));
});

test('docsSite on a template with a native UI is rejected by validation', () => {
  const spec = getPreset('rust-web-app');
  spec.uiUx!.docsSite = true;
  const issues = validateProjectUiUxConfig(spec, spec.uiUx);
  assert.ok(issues.some((issue) => issue.id === 'uiux-docs-site-with-native-ui' && issue.severity === 'error'));
  const architecture = SpecForge.resolve(spec);
  assert.equal(architecture.isValid, false);
});

test('unresolved local references warn instead of blocking non-Static-Web scaffolds', () => {
  const spec = getPreset('python-api-service');
  const config = spec.uiUx!;
  config.docsSite = true;
  config.pages[0].sourcePath = 'docs/overview.md';
  config.pages[0].markdown = [
    '[Page absente](../guides/not-imported.md)',
    '![Image absente](../assets/not-imported.jpg)',
  ].join('\n\n');

  const architecture = SpecForge.resolve(spec);
  const unresolvedReferences = architecture.issues.filter((issue) =>
    issue.id.startsWith('uiux-reference-missing-'),
  );
  const files = SpecForge.generate(spec, architecture);

  assert.equal(architecture.isValid, true);
  assert.equal(unresolvedReferences.length, 2);
  assert.ok(unresolvedReferences.every((issue) => issue.severity === 'warning'));
  assert.ok(files.some((file) => file.path === `${UI_UX_DOCS_SITE_DIRECTORY}/index.html`));
});

test('internal content instructions remain in the specification and are not published', () => {
  const spec = getPreset('python-api-service');
  spec.uiUx!.contentInstruction = 'INTERNAL_PAGE_PLACEMENT_NOTE';
  spec.uiUx!.docsSite = true;

  const files = SpecForge.generate(spec);
  const html = files.find((file) => file.path === `${UI_UX_DOCS_SITE_DIRECTORY}/index.html`);
  const sourceOfTruth = files.find((file) => file.path === 'project.yaml');

  assert.ok(html);
  assert.ok(sourceOfTruth);
  assert.doesNotMatch(html.content, /INTERNAL_PAGE_PLACEMENT_NOTE/);
  assert.match(sourceOfTruth.content, /INTERNAL_PAGE_PLACEMENT_NOTE/);
});

test('composition bricks render natively in the Askama target and its preview', () => {
  const spec = getPreset('rust-web-app');
  const config = spec.uiUx!;
  config.compositionMode = 'layout-driven';
  config.pages[0].blocks = [
    { id: 'hero-1', brickId: 'hero', properties: { title: 'Bienvenue', subtitle: 'Sous-titre configuré', actionLabel: 'Démarrer', actionUrl: '/dashboard' } },
    { id: 'features-1', brickId: 'features', properties: { heading: 'Atouts', items: ['Rapide', 'Sûr'] } },
    { id: 'cta-1', brickId: 'call-to-action', properties: { title: 'Prêt ?', text: 'Contactez-nous', actionLabel: 'Contact', actionUrl: 'https://example.com' } },
  ];

  const files = SpecForge.generate(spec);
  const home = files.find((file) => file.path === 'templates/index.html')?.content ?? '';
  const style = files.find((file) => file.path === 'static/css/style.css')?.content ?? '';

  assert.match(home, /<section class="hero">/);
  assert.match(home, /<h1>Bienvenue<\/h1>/);
  assert.match(home, /href="\/dashboard"/);
  assert.match(home, /<article class="card"><h3>Rapide<\/h3><\/article>/);
  assert.match(home, /uiux-cta/);
  assert.match(home, /href="https:\/\/example\.com"/);
  assert.match(style, /\.content-section/);
  assert.match(style, /\.gallery-grid/);

  const preview = renderAskamaUiUxPreview(spec, config, config.pages[0].slug, 'light');
  assert.match(preview, /<h1>Bienvenue<\/h1>/);
  assert.match(preview, /class="navigation"/);
});

test('Askama templates escape template delimiters present in configured content', () => {
  const spec = getPreset('rust-web-app');
  spec.uiUx!.pages[0].markdown = '# Code\n\n```rust\nlet x = "{{ value }}";\n```';

  const files = SpecForge.generate(spec);
  const home = files.find((file) => file.path === 'templates/index.html')?.content ?? '';
  assert.doesNotMatch(home, /"\{\{ value \}\}"/);
  assert.match(home, /\{\{ "\{\{" \}\}/);
});

test('React and Dioxus previews render the configured content with their own visual language', () => {
  const reactSpec = getPreset('react-frontend-only');
  reactSpec.uiUx!.pages[0].markdown = '# Interface React\n\nContenu React configuré.';
  reactSpec.uiUx!.navigation = 'sidebar';
  const reactPreview = renderReactUiUxPreview(reactSpec, reactSpec.uiUx!, undefined, 'dark');
  assert.match(reactPreview, /Interface React/);
  assert.match(reactPreview, /class="sidebar"/);

  const dioxusSpec = getPreset('rust-dioxus-mobile');
  dioxusSpec.uiUx!.pages[0].markdown = '# Application mobile\n\nContenu mobile configuré.';
  const dioxusPreview = renderDioxusUiUxPreview(dioxusSpec, dioxusSpec.uiUx!);
  assert.match(dioxusPreview, /Application mobile/);
  assert.match(dioxusPreview, /class="mobile-frame app-shell" data-theme="dark"/);

  const apiSpec = getPreset('go-api-service');
  const docsPreview = renderProjectUiUxPreview(apiSpec, apiSpec.uiUx!, undefined, 'light');
  assert.match(docsPreview, /site-shell template-documentation/);
});

test('previews stack all pages with clickable anchor navigation and a standard dropdown panel', () => {
  const spec = getPreset('rust-web-app');
  spec.uiUx!.navigation = 'burger';
  spec.uiUx!.pages.push({
    id: 'page-guide', title: 'Guide', slug: 'guide', description: '',
    order: 1, category: '', tags: [], markdown: '# Guide\n\nContenu du guide.', blocks: [],
  });

  const preview = renderAskamaUiUxPreview(spec, spec.uiUx!, undefined, 'light');
  // Toutes les pages empilées avec ancres cliquables.
  assert.match(preview, /<section class="preview-page" id="guide">/);
  assert.match(preview, /<a href="#guide"[^>]*>Guide<\/a>/);
  // Burger présent et panneau déroulant standard uniforme (300px / 85vw),
  // aligné à droite sous le bouton burger.
  assert.match(preview, /data-menu-toggle/);
  assert.match(preview, /\.navigation\.open \{\s*display: flex;\s*position: fixed;\s*top: 76px;\s*right:/);
  assert.match(preview, /width: 300px;\s*max-width: 85vw;/);
  // Navigation par ancres interceptée (pas de rechargement de l'iframe).
  assert.match(preview, /scrollIntoView\(\{ behavior: 'smooth'/);
  assert.match(preview, /event\.preventDefault\(\)/);

  const reactSpec = getPreset('react-frontend-only');
  const reactPreview = renderReactUiUxPreview(reactSpec, reactSpec.uiUx!, undefined, 'dark');
  assert.match(reactPreview, /class="drawer-panel"/);
  assert.match(reactPreview, /\.drawer-panel \{ width: 300px; max-width: 85vw;/);

  const dioxusSpec = getPreset('rust-dioxus-mobile');
  const dioxusPreview = renderDioxusUiUxPreview(dioxusSpec, dioxusSpec.uiUx!);
  assert.match(dioxusPreview, /class="drawer-panel"/);
  assert.match(dioxusPreview, /\.drawer-panel \{ width: 300px; max-width: 85vw;/);
});

test('theme presets Paper, Ocean and Obsidian produce clearly distinct palettes', () => {
  const spec = getPreset('rust-web-app');
  const render = (preset: 'paper' | 'ocean' | 'obsidian', mode: 'light' | 'dark') => {
    spec.uiUx!.theme = { ...spec.uiUx!.theme, preset, ...(preset === 'paper' ? { primary: '#b45309', background: '#f7f2e8', text: '#2b2622', darkBackground: '#1c1917', darkText: '#f3ece1' } : preset === 'ocean' ? { primary: '#0369a1', background: '#eef7fb', text: '#0b3a53', darkBackground: '#082c44', darkText: '#dff1fb' } : { primary: '#6d28d9', background: '#f2f1f5', text: '#1b1826', darkBackground: '#110f18', darkText: '#e7e5f0' }) };
    return renderAskamaUiUxPreview(spec, spec.uiUx!, undefined, mode);
  };
  const paper = render('paper', 'light');
  const ocean = render('ocean', 'light');
  const obsidian = render('obsidian', 'light');
  assert.match(paper, /--color-background: #f7f2e8/);
  assert.match(ocean, /--color-background: #eef7fb/);
  assert.match(obsidian, /--color-background: #f2f1f5/);
  assert.match(paper, /--color-accent: #b45309/);
  assert.match(ocean, /--color-accent: #0369a1/);
  assert.match(obsidian, /--color-accent: #6d28d9/);
  assert.notEqual(paper, ocean);
  assert.notEqual(ocean, obsidian);
});

test('dark mode derives contrasting surfaces and muted text', () => {
  const spec = getPreset('rust-web-app');
  const preview = renderAskamaUiUxPreview(spec, spec.uiUx!, undefined, 'dark');
  const background = spec.uiUx!.theme.darkBackground;
  assert.match(preview, new RegExp(`--color-background: ${background}`));
  // Les surfaces ne restent pas blanches en mode sombre : elles dérivent du fond.
  assert.doesNotMatch(preview, /--color-surface: #ffffff/);
  assert.match(preview, /--color-text: #f3ece1|--color-text: #f3f4f6/);
});

test('every applicative template ships a working light/dark toggle with both palettes', () => {
  // Askama — rust-web-app : bouton d'en-tête, JS persistant, palettes doubles.
  const rustWebApp = SpecForge.generate(getPreset('rust-web-app'));
  const rwaHeader = rustWebApp.find((file) => file.path === 'templates/components/header.html')?.content ?? '';
  const rwaJs = rustWebApp.find((file) => file.path === 'static/js/app.js')?.content ?? '';
  const rwaTokens = rustWebApp.find((file) => file.path === 'static/css/tokens.css')?.content ?? '';
  assert.match(rwaHeader, /data-theme-toggle/);
  assert.match(rwaJs, /specforge-theme/);
  assert.match(rwaJs, /document\.documentElement\.dataset\.theme = next/);
  assert.match(rwaTokens, /:root\[data-theme="dark"\] \{/);
  assert.match(rwaTokens, /--color-background: #f7f2e8/);
  assert.match(rwaTokens, /--color-background: #1c1917/);

  // Askama — rust-web-frontend : interrupteur natif, deux blocs alimentés.
  const rustWebFrontend = SpecForge.generate(getPreset('rust-web-frontend'));
  const rwfTokens = rustWebFrontend.find((file) => file.path === 'static/css/tokens.css')?.content ?? '';
  const rwfJs = rustWebFrontend.find((file) => file.path === 'static/js/app.js')?.content ?? '';
  assert.match(rwfTokens, /\[data-theme="light"\][\s\S]*?--color-bg: #f7f2e8/);
  assert.match(rwfJs, /specforge-theme/);

  // React : état initial système + persistance, interrupteur sidebar et mobile.
  const reactFiles = SpecForge.generate(getPreset('react-frontend-only'));
  const appTsx = reactFiles.find((file) => file.path === 'frontend/src/App.tsx')?.content ?? '';
  const indexCss = reactFiles.find((file) => file.path === 'frontend/src/index.css')?.content ?? '';
  assert.match(appTsx, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(appTsx, /localStorage\.setItem\('specforge-theme'/);
  assert.match(appTsx, /toggleTheme/);
  assert.match(indexCss, /:root\[data-theme="light"\] \{/);

  // Dioxus : signal de thème, attribut data-theme, palette claire dédiée.
  const dioxusFiles = SpecForge.generate(getPreset('rust-dioxus-mobile'));
  const mainRs = dioxusFiles.find((file) => file.path === 'src/main.rs')?.content ?? '';
  const mainCss = dioxusFiles.find((file) => file.path === 'assets/main.css')?.content ?? '';
  assert.match(mainRs, /let mut theme = use_signal/);
  assert.match(mainRs, /"data-theme": "\{theme\}"/);
  assert.match(mainCss, /\.app-shell\[data-theme="light"\] \{/);
});

test('render targets resolve deterministically from the template integration registry', () => {
  assert.equal(resolveUiUxRenderTarget(getPreset('rust-web-app')), 'askama');
  assert.equal(resolveUiUxRenderTarget(getPreset('rust-web-frontend')), 'askama');
  assert.equal(resolveUiUxRenderTarget(getPreset('rust-react-postgres')), 'react');
  assert.equal(resolveUiUxRenderTarget(getPreset('react-frontend-only')), 'react');
  assert.equal(resolveUiUxRenderTarget(getPreset('rust-tauri-react')), 'react');
  assert.equal(resolveUiUxRenderTarget(getPreset('rust-dioxus-mobile')), 'dioxus');
  assert.equal(resolveUiUxRenderTarget(getPreset('python-api-service')), null);
  assert.ok(isApiOnlyUiUxTemplate(getPreset('go-api-service')));
  assert.ok(!isApiOnlyUiUxTemplate(getPreset('rust-web-app')));
});

test('default UI/UX configuration is content-driven and carries the project identity', () => {
  const spec = getPreset('rust-web-app');
  const config: ProjectUiUxConfig = createDefaultProjectUiUxConfig(spec);
  assert.equal(config.compositionMode, 'content-driven');
  assert.equal(config.docsSite, false);
  assert.equal(config.pages.length, 1);
  assert.match(config.pages[0].markdown, new RegExp(`# ${spec.project.name}`));
});
