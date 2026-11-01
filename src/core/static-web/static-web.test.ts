import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESETS } from '../../engine/presets';
import { ProjectSpecification, StaticWebConfig } from '../types';
import { SpecForge } from '../index';
import { STATIC_WEB_BRICKS, validateStaticWebConfig } from './bricks';
import { resolveUiUxOutputDirectory } from './config';
import { mergeImportedMarkdownPages, parseMarkdownFile } from './content';
import { generateStaticWebSite, renderStaticWebPreview } from './render';

function makeSpec(exportMode: StaticWebConfig['exportMode']): ProjectSpecification {
  const preset = PRESETS.find((candidate) => candidate.id === 'static-web-documentation');
  assert.ok(preset);
  const staticWeb = structuredClone(preset.spec.staticWeb!);
  staticWeb.exportMode = exportMode;
  return { ...preset.spec, staticWeb };
}

test('parses frontmatter metadata and derives stable page identity', () => {
  const result = parseMarkdownFile(
    'guides/first-steps.md',
    `---
title: First steps
slug: getting-started
description: A short guide
order: 4
category: Guides / Basics
tags: [start, tutorial]
template: article
---
# Intro
Body text`,
  );

  assert.equal(result.page.title, 'First steps');
  assert.equal(result.page.slug, 'getting-started');
  assert.equal(result.page.order, 4);
  assert.equal(result.page.category, 'Guides / Basics');
  assert.deepEqual(result.page.tags, ['start', 'tutorial']);
  assert.equal(result.page.template, 'article');
  assert.equal(result.page.sourcePath, 'guides/first-steps.md');
  assert.match(result.page.markdown, /^# Intro/);
});

test('rejects malformed or unsafe frontmatter paths explicitly', () => {
  assert.throws(() => parseMarkdownFile('../secret.md', '# Not safe'), /Chemin Markdown non sûr/);
  assert.throws(() => parseMarkdownFile('broken.md', '---\ntitle: [\n---\ntext'), /Frontmatter YAML invalide/);
});

test('importing Markdown replaces only unchanged starter pages and reimports by source path', () => {
  const presets = PRESETS.filter((candidate) => candidate.spec.profile === 'static-web');
  const starterPages = presets.flatMap((preset) => preset.spec.staticWeb!.pages);
  const documentationPreset = presets.find((preset) => preset.id === 'static-web-documentation')!;
  const editedStarter = {
    ...structuredClone(documentationPreset.spec.staticWeb!.pages[0]),
    markdown: '# My own introduction',
  };
  const firstImport = parseMarkdownFile('guides/overview.md', '# First version', 2).page;
  const firstMerge = mergeImportedMarkdownPages(
    [...structuredClone(documentationPreset.spec.staticWeb!.pages), editedStarter],
    [firstImport],
    starterPages,
  );

  assert.deepEqual(firstMerge.map((page) => page.id), [editedStarter.id, firstImport.id]);
  assert.equal(firstMerge[0].markdown, '# My own introduction');

  const updatedImport = parseMarkdownFile('guides/overview.md', '# Updated version', 3).page;
  const secondMerge = mergeImportedMarkdownPages(firstMerge, [updatedImport], starterPages);
  assert.deepEqual(secondMerge.map((page) => page.id), [editedStarter.id, updatedImport.id]);
  assert.equal(secondMerge[1].markdown, '# Updated version');
});

test('resolves relative links between nested imported Markdown pages', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.pages = [
    parseMarkdownFile(
      'project/docs/start.md',
      '[Règles métier](../specifications/regles-metier.md#consultation)',
    ).page,
    parseMarkdownFile(
      'project/specifications/regles-metier.md',
      '# Règles\n\n## Consultation',
    ).page,
  ];

  const issues = validateStaticWebConfig(spec.profile, spec.template, config);
  const html = renderStaticWebPreview(config, 'start', 'static-website');

  assert.equal(issues.filter((issue) => issue.id.startsWith('static-web-reference-missing-')).length, 0);
  assert.match(html, /href="#regles-metier-consultation"/);
});

test('unresolved local references warn instead of blocking non-Static-Web scaffolds', () => {
  const preset = PRESETS.find((candidate) => candidate.spec.template === 'api-service');
  assert.ok(preset?.spec.uiUx);
  const spec = structuredClone(preset.spec);
  const config = spec.uiUx!;
  config.pages[0].sourcePath = 'docs/overview.md';
  config.pages[0].markdown = [
    '[Page absente](../guides/not-imported.md)',
    '![Image absente](../assets/not-imported.jpg)',
  ].join('\n\n');

  const architecture = SpecForge.resolve(spec);
  const unresolvedReferences = architecture.issues.filter((issue) =>
    issue.id.startsWith('static-web-reference-missing-'),
  );
  const files = SpecForge.generate(spec, architecture);

  assert.equal(architecture.isValid, true);
  assert.equal(unresolvedReferences.length, 2);
  assert.ok(unresolvedReferences.every((issue) => issue.severity === 'warning'));
  assert.ok(files.some((file) => file.path === 'docs-site/index.html'));
});

test('renders imported content safely and includes in-page contents links', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.pages[0].markdown = [
    '# Guide',
    '<img src=x onerror="alert(1)">',
    '## Install',
    '[unsafe](javascript:alert(1))',
    '```ts',
    'const answer = 42;',
    '```',
    '| Name | Value |',
    '| --- | --- |',
    '| SpecForge | static |',
    '```mermaid',
    'flowchart TD',
    'Start[Start] --> Finish[Finish]',
    '```',
  ].join('\n');

  const html = renderStaticWebPreview(config);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /class="tok-keyword">const/);
  assert.match(html, /<table>/);
  assert.match(html, /class="mermaid-diagram"/);
  assert.match(html, /href="#getting-started-install"/);
});

test('static website templates render distinct starter layouts, content, and project branding', () => {
  const presets = PRESETS.filter((candidate) => candidate.spec.profile === 'static-web');
  const rendered = presets.map((preset) =>
    renderStaticWebPreview(
      preset.spec.staticWeb!,
      undefined,
      preset.spec.template,
      preset.spec.project.name,
    ),
  );

  assert.match(rendered[0], /site-shell template-documentation/);
  assert.match(rendered[1], /site-shell template-website/);
  assert.match(rendered[2], /site-shell template-landing-page/);
  assert.match(rendered[0], /data-site-search/);
  assert.doesNotMatch(rendered[1], /<input[^>]*data-site-search|<strong>On this page<\/strong>/);
  assert.doesNotMatch(rendered[2], /<input[^>]*data-site-search|<strong>On this page<\/strong>/);
  assert.match(rendered[1], /Mon site web/);
  assert.match(rendered[1], /Une présentation claire/);
  assert.match(rendered[1], /href="#about"/);
  assert.match(rendered[1], /id="about"/);
  assert.match(rendered[1], /scrollIntoView/);
  assert.match(rendered[2], /Donnez vie à votre prochaine grande idée/);
  assert.match(rendered[2], /Votre prochain client/);
  assert.match(rendered[2], /href="#content"/);
  assert.notEqual(rendered[0], rendered[1]);
  assert.notEqual(rendered[1], rendered[2]);

  const generatedWebsite = generateStaticWebSite(
    PRESETS.find((preset) => preset.id === 'static-web-website')!.spec,
  );
  const stylesheet = generatedWebsite.find((file) => file.path === 'static-web.css')!;
  assert.match(stylesheet.content, /\.template-website/);
  assert.match(stylesheet.content, /\.template-landing-page/);
});

test('renders accessible responsive controls for each navigation mode', () => {
  const spec = makeSpec('multi-file');
  const config = spec.staticWeb!;

  for (const navigation of ['topbar', 'sidebar', 'combined', 'burger'] as const) {
    config.navigation = navigation;
    const html = renderStaticWebPreview(
      config,
      undefined,
      spec.template,
      spec.project.name,
    );
    const usesTopbar = navigation !== 'sidebar';
    const usesSidebar = navigation === 'sidebar' || navigation === 'combined';

    assert.equal(html.includes(`class="topbar navigation-${navigation}"`), usesTopbar);
    assert.equal(html.includes('class="sidebar"'), usesSidebar);
    assert.equal(/<button[^>]*data-nav-toggle/.test(html), usesTopbar);
    assert.equal(/<div[^>]*data-nav-panel/.test(html), usesTopbar);
    assert.equal(/<button[^>]*data-sidebar-toggle/.test(html), usesSidebar);
    assert.equal(/<nav[^>]*id="sidebar-navigation"[^>]*data-sidebar-navigation/.test(html), usesSidebar);
  }

  config.navigation = 'sidebar';
  const sidebarHtml = renderStaticWebPreview(config, undefined, spec.template, spec.project.name);
  assert.match(sidebarHtml, /aria-expanded="true" aria-controls="sidebar-navigation" aria-label="Fermer le menu latéral"/);
  assert.match(sidebarHtml, /classList\.toggle\('sidebar-closed', !open\)/);
  assert.match(sidebarHtml, /sidebar-closed \.sidebar-navigation/);
  assert.match(sidebarHtml, /max-width:900px/);

  config.navigation = 'burger';
  const issues = validateStaticWebConfig(spec.profile, spec.template, config);
  assert.ok(!issues.some((issue) => issue.id === 'static-web-navigation-invalid'));

  const html = renderStaticWebPreview(config, undefined, spec.template, spec.project.name);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="site-navigation"/);
  assert.match(html, /classList\.toggle\('is-open', open\)/);
  assert.match(html, /max-width:900px/);
  assert.match(html, /flex-wrap:wrap/);
});

test('new Static Web presets only offer the sidebar or burger navigation', () => {
  const presets = PRESETS.filter((candidate) => candidate.spec.profile === 'static-web');
  assert.deepEqual(
    presets.map((preset) => preset.spec.staticWeb!.navigation),
    ['sidebar', 'burger', 'burger'],
  );
});

test('generates a self-contained HTML file with bundled styles, script, and imported assets', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.assets.push({
    path: 'images/mark.svg',
    mediaType: 'image/svg+xml',
    content: 'PHN2Zy8+',
    encoding: 'base64',
  });
  config.pages[0].markdown = '![Mark](./images/mark.svg)\n\n# Offline site';

  const files = generateStaticWebSite(spec);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'index.html');
  assert.match(files[0].content, /<style>/);
  assert.match(files[0].content, /<script>/);
  assert.match(files[0].content, /data:image\/svg\+xml;base64,PHN2Zy8\+/);
  assert.doesNotMatch(files[0].content, /<script[^>]+src=/i);
  assert.doesNotMatch(files[0].content, /https?:\/\/.*(?:stylesheet|script)/i);
});

test('generates local multi-file pages, styles, runtime, and assets', () => {
  const spec = makeSpec('multi-file');
  const config = spec.staticWeb!;
  config.assets.push({
    path: 'media/photo.png',
    mediaType: 'image/png',
    content: 'aGVsbG8=',
    encoding: 'base64',
  });
  config.pages[0].markdown = '# Guide\n\n![Photo](media/photo.png)';

  const files = generateStaticWebSite(spec);
  const paths = files.map((file) => file.path);
  assert.ok(paths.includes('index.html'));
  assert.ok(paths.includes('getting-started.html'));
  assert.ok(paths.includes('reference.html'));
  assert.ok(paths.includes('static-web.css'));
  assert.ok(paths.includes('static-web.js'));
  assert.ok(paths.includes('assets/media/photo.png'));
  assert.match(files.find((file) => file.path === 'getting-started.html')!.content, /src="assets\/media\/photo\.png"/);
  assert.match(files.find((file) => file.path === 'static-web.css')!.content, /\.nav-toggle/);
  assert.match(files.find((file) => file.path === 'static-web.js')!.content, /data-nav-toggle/);
});

test('validates duplicate slugs, unsupported URLs, missing assets, and color values', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.theme.primary = 'red; background:url(javascript:alert(1))';
  config.contentInstruction = 'x'.repeat(2001);
  config.pages[0].markdown = '[bad](javascript:alert(1)) ![missing](./absent.png)';
  config.pages.push({ ...config.pages[0], id: 'duplicate', title: 'Duplicate' });

  const issueIds = validateStaticWebConfig(spec.profile, spec.template, config).map((issue) => issue.id);
  assert.ok(issueIds.includes('static-web-color-primary'));
  assert.ok(issueIds.includes('static-web-content-instruction-invalid'));
  assert.ok(issueIds.some((id) => id.startsWith('static-web-url-')));
  assert.ok(issueIds.includes('static-web-page-duplicate-2'));
  assert.ok(issueIds.some((id) => id.startsWith('static-web-reference-missing-')));
});

test('declares all required composition bricks and compatible profiles', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.compositionMode = 'layout-driven';
  config.pages[0].blocks = [
    { id: 'hero-1', brickId: 'hero', properties: { title: 'Welcome', subtitle: 'Static content', actionLabel: '', actionUrl: '' } },
  ];
  const html = renderStaticWebPreview(config);
  assert.match(html, /<h1>Welcome<\/h1>/);
  assert.deepEqual(
    ['hero', 'text-content', 'features', 'gallery', 'testimonials', 'call-to-action'].sort(),
    STATIC_WEB_BRICKS.map((brick) => brick.id).sort(),
  );
});

test('all starter presets resolve and generate deterministically through the Core facade', () => {
  const presets = PRESETS.filter((candidate) => candidate.spec.profile === 'static-web');
  assert.equal(presets.length, 3);

  for (const preset of presets) {
    const architecture = SpecForge.resolve(preset.spec);
    assert.equal(architecture.isValid, true, `${preset.name} should resolve without errors`);
    const first = SpecForge.generate(preset.spec, architecture);
    const second = SpecForge.generate(preset.spec, architecture);
    assert.ok(first.some((file) => file.path === 'index.html'));
    assert.equal(SpecForge.computeHash(first), SpecForge.computeHash(second));
  }
});

test('all non-Static-Web presets expose and generate their UI/UX pages', () => {
  const presets = PRESETS.filter((preset) => preset.spec.profile !== 'static-web');
  assert.equal(presets.length, 8);

  for (const preset of presets) {
    assert.ok(preset.spec.uiUx, `${preset.name} should have UI/UX configuration`);
    const architecture = SpecForge.resolve(preset.spec);
    assert.equal(architecture.isValid, true, `${preset.name} should remain valid`);
    const files = SpecForge.generate(preset.spec, architecture);
    const outputDirectory = resolveUiUxOutputDirectory(preset.spec);
    const index = files.find((file) => file.path === `${outputDirectory}/index.html`);

    assert.ok(index, `${preset.name} should generate ${outputDirectory}/index.html`);
    assert.ok(index.content.includes(preset.spec.project.name));
  }
});

test('internal content instructions remain in the specification and are not published', () => {
  const preset = PRESETS.find((candidate) => candidate.spec.template === 'api-service');
  assert.ok(preset?.spec.uiUx);
  const spec = structuredClone(preset.spec);
  spec.uiUx!.contentInstruction = 'INTERNAL_PAGE_PLACEMENT_NOTE';

  const files = SpecForge.generate(spec);
  const html = files.find((file) => file.path === `${resolveUiUxOutputDirectory(spec)}/index.html`);
  const sourceOfTruth = files.find((file) => file.path === 'project.yaml');

  assert.ok(html);
  assert.ok(sourceOfTruth);
  assert.doesNotMatch(html.content, /INTERNAL_PAGE_PLACEMENT_NOTE/);
  assert.match(sourceOfTruth.content, /INTERNAL_PAGE_PLACEMENT_NOTE/);
});

test('Single Page organization remains one HTML page in a multi-file export', () => {
  const spec = makeSpec('multi-file');
  const config = spec.staticWeb!;
  config.organization = 'single-page';

  const files = generateStaticWebSite(spec);
  const htmlFiles = files.filter((file) => file.language === 'html');
  assert.deepEqual(htmlFiles.map((file) => file.path), ['index.html']);
  assert.match(htmlFiles[0].content, /href="#getting-started"/);
  assert.match(htmlFiles[0].content, /href="static-web\.css"/);
});

test('single-file preview namespaces duplicate headings and bundles a local search index safely', () => {
  const spec = makeSpec('single-html');
  const config = spec.staticWeb!;
  config.pages[0].title = 'Guide </script><script>alert(1)</script>';
  config.pages[0].markdown = '# Guide\n\nunique search phrase\n\n</script><script>alert(1)</script>';
  config.pages[1].markdown = '# Guide\n\nAnother page';

  const html = renderStaticWebPreview(config);
  assert.match(html, /id="getting-started-guide"/);
  assert.match(html, /id="reference-guide"/);
  assert.match(html, /unique search phrase/);
  assert.match(html, /\\u003c\/script>/);
  assert.match(html, /&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test('renders common Mermaid sequence diagrams locally', () => {
  const spec = makeSpec('single-html');
  spec.staticWeb!.pages[0].markdown = [
    '```mermaid',
    'sequenceDiagram',
    'participant User as Visitor',
    'participant Site',
    'User->>Site: Open page',
    'Site-->>User: Render HTML',
    '```',
  ].join('\n');

  const html = renderStaticWebPreview(spec.staticWeb!);
  assert.match(html, /aria-label="Mermaid sequence diagram"/);
  assert.match(html, /Visitor/);
  assert.match(html, /Render HTML/);
});
