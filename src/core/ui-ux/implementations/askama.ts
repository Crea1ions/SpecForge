/**
 * SpecForge Core — Implémentation UI/UX native Askama (Rust / Axum)
 *
 * Alimente l'interface native des templates Askama (rust-web-app,
 * rust-web-frontend) à partir de la configuration UI/UX commune : pages et
 * blocs rendus dans les templates Askama, thème injecté dans les tokens CSS,
 * navigation dérivée des pages configurées. Aucun site HTML parallèle n'est
 * produit : le contenu vit dans les templates servis par l'application.
 */

import {
  ProjectSpecification,
  ProjectUiUxBlock,
  ProjectUiUxBlockRenderContext,
  ProjectUiUxBrickImplementation,
  ProjectUiUxConfig,
  ProjectUiUxPage,
} from '../../types';
import { sortStaticWebPages } from '../../static-web/content';
import { escapeHtml } from '../../static-web/render';
import { deriveUiUxPalette, hexColor, UiUxPalette } from '../theme';
import {
  renderUiUxBlockHtml,
  renderUiUxPageBodyHtml,
  UI_UX_PREVIEW_STRATEGY,
  UiUxHtmlRenderStrategy,
} from './html-blocks';

/** Routes Axum natives : accueil sur '/', pages additionnelles sur '/<slug>'. */
export const ASKAMA_SCAFFOLD_STRATEGY: UiUxHtmlRenderStrategy = {
  mode: 'scaffold',
  pageHref: (slug, isFirst) => (isFirst ? '/' : `/${slug}`),
  assetPrefix: '/static/assets/',
};

/**
 * Échappe les délimiteurs Askama (`{{`, `{%`, `{#`) présents dans le contenu
 * généré (ex. extraits de code) pour qu'ils soient rendus littéralement.
 */
export function escapeAskamaDelimiters(html: string): string {
  return html
    .replace(/\{\{/g, '{{ "{{" }}')
    .replace(/\{%/g, '{{ "{%" }}')
    .replace(/\{#/g, '{{ "{#" }}');
}

function toRustIdentifier(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^(\d)/, '_$1');
}

function toStructName(slug: string): string {
  const pascal = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `${pascal || 'Page'}Template`;
}

export interface AskamaUiUxPage {
  slug: string;
  title: string;
  /** Chemin du template dans le scaffold (ex. templates/index.html). */
  templatePath: string;
  /** Contenu du template Askama généré. */
  template: string;
  /** Route native servie par l'application ('/' ou '/<slug>'). */
  routePath: string;
  /** Identifiants Rust du handler et de la struct Askama. */
  handlerName: string;
  structName: string;
}

export interface AskamaUiUxRender {
  /** Première page = accueil de l'application, puis pages additionnelles. */
  pages: AskamaUiUxPage[];
  /** Liens de navigation issus des pages configurées (hors routes métier). */
  navigationLinks: { href: string; label: string }[];
  /** Assets importés à émettre sous 'static/assets/'. */
  assetFiles: { path: string; content: string; mediaType: string }[];
}

function blockContext(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  page: ProjectUiUxPage,
): ProjectUiUxBlockRenderContext {
  return { spec, config, page };
}

/** Corps de page HTML prêt à être embarqué dans un template Askama. */
export function renderAskamaPageBody(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  page: ProjectUiUxPage,
): string {
  return renderUiUxPageBodyHtml(blockContext(spec, config, page), ASKAMA_SCAFFOLD_STRATEGY);
}

/** Rendu complet des pages configurées en templates Askama natifs. */
export function renderAskamaUiUx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
): AskamaUiUxRender {
  const sorted = sortStaticWebPages(config.pages);
  const pages: AskamaUiUxPage[] = sorted.map((page, index) => {
    const isHome = index === 0;
    const body = escapeAskamaDelimiters(renderAskamaPageBody(spec, config, page));
    const template = `{% extends "layout.html" %}

{% block title %}${escapeAskamaDelimiters(escapeHtml(page.title))} · ${escapeAskamaDelimiters(escapeHtml(spec.project.name))}{% endblock %}

{% block content %}
${body}
{% endblock %}
`;
    return {
      slug: page.slug,
      title: page.title,
      templatePath: isHome ? 'templates/index.html' : `templates/pages/${page.slug}.html`,
      template,
      routePath: isHome ? '/' : `/${page.slug}`,
      handlerName: isHome ? 'index' : `page_${toRustIdentifier(page.slug)}`,
      structName: toStructName(page.slug),
    };
  });

  return {
    pages,
    navigationLinks: pages.map((page) => ({ href: page.routePath, label: page.title })),
    assetFiles: config.assets.map((asset) => ({
      path: `static/assets/${asset.path}`,
      content: asset.content,
      mediaType: asset.mediaType,
    })),
  };
}

/** Noms des tokens de thème propres à chaque template Askama. */
export interface AskamaThemeTokens {
  background: string;
  text: string;
  accent: string;
  accentHover?: string;
  surface?: string;
  surfaceMuted?: string;
  border?: string;
  textMuted?: string;
}

const RUST_WEB_APP_THEME_TOKENS: AskamaThemeTokens = {
  background: '--color-background',
  text: '--color-text',
  accent: '--color-accent',
  accentHover: '--color-accent-hover',
  surface: '--color-surface',
  surfaceMuted: '--color-surface-muted',
  border: '--color-border',
  textMuted: '--color-text-muted',
};

/** Tokens du design system de rust-web-frontend (blocs :root sombre + [data-theme="light"]). */
export const RUST_WEB_FRONTEND_THEME_TOKENS: AskamaThemeTokens = {
  background: '--color-bg',
  text: '--color-text',
  accent: '--color-accent',
  surface: '--color-surface',
  surfaceMuted: '--color-surface-secondary',
  border: '--color-border',
  textMuted: '--color-text-muted',
};

function paletteReplacements(
  palette: UiUxPalette,
  tokens: AskamaThemeTokens,
): Record<string, string> {
  const replacements: Record<string, string> = {
    [tokens.background]: palette.background,
    [tokens.text]: palette.text,
    [tokens.accent]: palette.primary,
  };
  if (tokens.accentHover) replacements[tokens.accentHover] = palette.primaryHover;
  if (tokens.surface) replacements[tokens.surface] = palette.surface;
  if (tokens.surfaceMuted) replacements[tokens.surfaceMuted] = palette.surfaceMuted;
  if (tokens.border) replacements[tokens.border] = palette.border;
  if (tokens.textMuted) replacements[tokens.textMuted] = palette.textMuted;
  return replacements;
}

function applyTokenReplacements(css: string, replacements: Record<string, string>): string {
  let output = css;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.replace(new RegExp(`(${token.replace(/-/g, '\\-')}:\\s*)#[\\da-fA-F]{6}`, 'g'), `$1${value}`);
  }
  return output;
}

/**
 * Injecte le thème UI/UX dans les tokens CSS natifs du template, avec les deux
 * palettes dérivées (claire et sombre) pour alimenter l'interrupteur de thème
 * embarqué par défaut dans les applications générées :
 * - design system à bloc `[data-theme="light"]` (rust-web-frontend) : palette
 *   sombre sur `:root`, claire sur le bloc light (comportement existant) ;
 * - sinon (rust-web-app) : palette claire sur `:root` et bloc
 *   `:root[data-theme="dark"]` ajouté avec la palette sombre.
 */
export function applyUiUxThemeToTokensCss(
  baseTokensCss: string,
  config: ProjectUiUxConfig,
  tokens: AskamaThemeTokens = RUST_WEB_APP_THEME_TOKENS,
): string {
  const lightMarker = '[data-theme="light"]';
  const light = paletteReplacements(deriveUiUxPalette(config.theme, 'light'), tokens);
  const dark = paletteReplacements(deriveUiUxPalette(config.theme, 'dark'), tokens);
  let output: string;
  if (baseTokensCss.includes(lightMarker)) {
    const markerIndex = baseTokensCss.indexOf(lightMarker);
    const darkPart = baseTokensCss.slice(0, markerIndex);
    const lightPart = baseTokensCss.slice(markerIndex + lightMarker.length);
    output =
      applyTokenReplacements(darkPart, dark) +
      lightMarker +
      applyTokenReplacements(lightPart, light);
  } else {
    const darkBlock = `:root[data-theme="dark"] {
${Object.entries(dark)
  .map(([token, value]) => `    ${token}: ${value};`)
  .join('\n')}
}`;
    output = `${applyTokenReplacements(baseTokensCss, light).trimEnd()}

/* UI/UX : palette sombre dérivée, activée par l'interrupteur de thème. */
${darkBlock}
`;
  }
  return `${output.trimEnd()}

/* UI/UX : accent secondaire configuré dans SpecForge. */
:root {
    --color-accent-alt: ${hexColor(config.theme.accent, '#0f766e')};
}
`;
}

/**
 * Règles CSS complémentaires portant les classes des blocs UI/UX dans le
 * design system natif du template (ajoutées à 'static/css/style.css').
 */
export function uiUxAskamaSupplementaryCss(config: ProjectUiUxConfig): string {
  const navigationCss = `
/* UI/UX : panneau déroulant standard du menu — identique sur toutes les
   cibles, aligné à droite sous le bouton burger. */
.navigation.open {
    display: flex;
    position: fixed;
    top: 76px;
    right: var(--space-4, 1rem);
    width: 300px;
    max-width: 85vw;
    max-height: 70vh;
    overflow-y: auto;
    padding: var(--space-3, 0.75rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 12px);
    box-shadow: 0 12px 32px rgb(0 0 0 / 18%);
    z-index: 60;
}

/* UI/UX : panneau standard du tiroir (rust-web-frontend). */
.drawer-panel {
    width: min(300px, 85vw);
}
${config.navigation === 'burger'
    ? `
/* UI/UX : navigation en menu burger sur toutes les tailles d'écran. */
.navigation:not(.open) {
    display: none;
}

.menu-button {
    display: inline-flex;
}

@media (min-width: 761px) {
    .app-body {
        grid-template-columns: minmax(0, 1fr);
    }
}
`
    : `
/* UI/UX : navigation latérale sur desktop ; le mobile bascule en burger. */
@media (min-width: 761px) {
    .menu-button {
        display: none;
    }
}
`}`;

  return `
/* UI/UX : sections de contenu et blocs configurés dans SpecForge. */
.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.7rem 1.1rem;
    border-radius: var(--radius-sm, 8px);
    font-weight: 600;
}

.button-primary {
    background: var(--color-accent);
    color: #ffffff;
}

.button-primary:hover {
    background: var(--color-accent-hover, var(--color-accent));
}

/* UI/UX : interrupteur clair/sombre, présent par défaut dans l'en-tête. */
.theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    min-height: 40px;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 8px);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
}

.content-section {
    margin-bottom: var(--space-8, 3rem);
}

.content-section > h2 {
    margin: 0 0 var(--space-4, 1rem);
    font-size: clamp(1.4rem, 3vw, 2rem);
    letter-spacing: -0.02em;
    color: var(--color-text);
}

.content-section h3 {
    margin: 0 0 var(--space-2, 0.5rem);
    font-size: 1.05rem;
    color: var(--color-text);
}

.content-section h4 {
    margin: var(--space-4, 1rem) 0 var(--space-2, 0.5rem);
    color: var(--color-text);
}

.content-section p {
    margin: 0 0 var(--space-4, 1rem);
    color: var(--color-text-muted);
}

.content-section ul,
.content-section ol {
    margin: 0 0 var(--space-4, 1rem);
    padding-left: var(--space-5, 1.5rem);
    color: var(--color-text-muted);
}

.content-section li + li {
    margin-top: var(--space-1, 0.25rem);
}

.content-section a:not(.button) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.content-section code {
    padding: 0.1rem 0.35rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 8px);
    font-size: 0.9em;
    color: var(--color-text);
}

.content-section pre {
    overflow-x: auto;
    margin: 0 0 var(--space-4, 1rem);
    padding: var(--space-4, 1rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 12px);
}

.content-section pre code {
    padding: 0;
    background: transparent;
    border: 0;
}

.content-section img {
    max-width: 100%;
    border-radius: var(--radius-md, 12px);
}

.content-section hr {
    margin: var(--space-6, 2rem) 0;
    border: 0;
    border-top: 1px solid var(--color-border);
}

.content-section blockquote {
    margin: 0 0 var(--space-4, 1rem);
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    background: var(--color-surface);
    border-left: 3px solid var(--color-accent-alt, var(--color-accent));
    border-radius: 0 var(--radius-sm, 8px) var(--radius-sm, 8px) 0;
    color: var(--color-text-muted);
}

.content-section .table-wrap {
    overflow-x: auto;
    margin-bottom: var(--space-4, 1rem);
}

.content-section table {
    width: 100%;
    border-collapse: collapse;
}

.content-section th,
.content-section td {
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border: 1px solid var(--color-border);
    text-align: left;
    color: var(--color-text-muted);
}

.content-section th {
    background: var(--color-surface);
    color: var(--color-text);
    font-weight: 600;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4, 1rem);
}

.card-grid .card {
    padding: var(--space-5, 1.5rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 12px);
    transition: border-color 0.15s ease, transform 0.15s ease;
}

.card-grid .card:hover {
    border-color: var(--color-accent);
    transform: translateY(-1px);
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4, 1rem);
}

.gallery-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-md, 12px);
    border: 1px solid var(--color-border);
}

.uiux-testimonial blockquote {
    margin: 0 0 var(--space-3, 0.75rem);
    font-size: 1.15rem;
    font-style: italic;
    color: var(--color-text);
}

.uiux-testimonial p {
    color: var(--color-text-muted);
}

.uiux-cta {
    padding: var(--space-6, 2rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg, 18px);
    text-align: center;
}

.uiux-cta p {
    color: var(--color-text-muted);
}

.uiux-cta .button {
    margin-top: var(--space-4, 1rem);
}

@media (max-width: 760px) {
    .gallery-grid,
    .card-grid {
        grid-template-columns: 1fr;
    }
}
${navigationCss}`;
}

/** Routes métier de fondation du template rust-web-frontend (préservées). */
const RUST_WEB_FRONTEND_BUSINESS_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
];

/**
 * Document autonome d'une page UI/UX pour rust-web-frontend : le layout de ce
 * template n'expose pas de bloc d'héritage, les pages configurées sont donc
 * générées comme documents complets réutilisant les classes du design system
 * natif (topbar, sidebar, tiroir, navigation mobile).
 */
function rustWebFrontendFrame(
  spec: ProjectSpecification,
  page: ProjectUiUxPage,
  body: string,
  links: { href: string; label: string }[],
  currentHref: string,
): string {
  const projectName = escapeAskamaDelimiters(escapeHtml(spec.project.name));
  const version = escapeAskamaDelimiters(escapeHtml(spec.project.version));
  const sidebarLinks = [
    ...links.map(
      (link) => `            <a href="${link.href}" class="${link.href === currentHref ? 'active' : ''}">
                ${escapeAskamaDelimiters(escapeHtml(link.label))}
            </a>`,
    ),
    ...RUST_WEB_FRONTEND_BUSINESS_LINKS.map(
      (link) => `            <a href="${link.href}">
                ${link.label}
            </a>`,
    ),
  ].join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeAskamaDelimiters(escapeHtml(page.description))}">
    <title>${escapeAskamaDelimiters(escapeHtml(page.title))} · ${projectName}</title>

    <link rel="icon" type="image/png" href="/static/favicon.png">
    <link rel="stylesheet" href="/static/css/tokens.css">
    <link rel="stylesheet" href="/static/css/style.css">
    <script src="/static/js/app.js" defer></script>
</head>
<body>

<div class="shell">

    <header class="topbar">
        <a href="/" class="brand">
            <span class="brand-mark" aria-hidden="true">S</span>
            <span>${projectName}</span>
        </a>

        <button
            type="button"
            class="theme-toggle"
            data-theme-toggle
            aria-label="Changer de thème">
            ◐
        </button>
    </header>

    <aside class="desktop-sidebar">
        <nav class="desktop-tree" aria-label="Navigation principale">
            <div class="tree-hub open">
                <div class="tree-children">
${sidebarLinks}
                </div>
            </div>
        </nav>
    </aside>

    <main class="content">
        <section class="stack">
${body}
        </section>
    </main>

    <nav class="bottom-nav" aria-label="Navigation mobile">
        <a href="/" class="${currentHref === '/' ? 'active' : ''}">
            <span class="nav-icon" aria-hidden="true">⌂</span>
            <span>Home</span>
        </a>

        <a href="/dashboard">
            <span class="nav-icon" aria-hidden="true">◈</span>
            <span>Dashboard</span>
        </a>

        <a href="/workspace">
            <span class="nav-icon" aria-hidden="true">□</span>
            <span>Workspace</span>
        </a>

        <button type="button" data-drawer-open>
            <span class="nav-icon" aria-hidden="true">☰</span>
            <span>Menu</span>
        </button>
    </nav>

    <div class="drawer" data-drawer aria-hidden="true">
        <div class="drawer-panel">

            <div class="drawer-head">
                <strong>${projectName}</strong>

                <button
                    type="button"
                    data-drawer-close
                    aria-label="Fermer le menu">
                    ×
                </button>
            </div>

            <nav class="desktop-tree" aria-label="Navigation principale">
                <div class="tree-hub open">
                    <div class="tree-children">
${sidebarLinks}
                    </div>
                </div>
            </nav>

        </div>
    </div>

    <footer class="footer">
        <span>${projectName}</span>
        <span>Rust Web Foundation · ${version}</span>
    </footer>

</div>

</body>
</html>
`;
}

/**
 * Rendu UI/UX complet pour rust-web-frontend : pages en documents autonomes
 * (le layout de ce template n'est pas héritable), mêmes routes et handlers
 * que pour rust-web-app.
 */
export function renderRustWebFrontendUiUx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
): AskamaUiUxRender {
  const sorted = sortStaticWebPages(config.pages);
  const links = sorted.map((entry, index) => ({
    href: index === 0 ? '/' : `/${entry.slug}`,
    label: entry.title,
  }));

  const pages: AskamaUiUxPage[] = sorted.map((page, index) => {
    const isHome = index === 0;
    const body = escapeAskamaDelimiters(renderAskamaPageBody(spec, config, page));
    const routePath = isHome ? '/' : `/${page.slug}`;
    return {
      slug: page.slug,
      title: page.title,
      templatePath: isHome ? 'templates/index.html' : `templates/pages/${page.slug}.html`,
      template: rustWebFrontendFrame(spec, page, body, links, routePath),
      routePath,
      handlerName: isHome ? 'home' : `page_${toRustIdentifier(page.slug)}`,
      structName: isHome ? 'HomeTemplate' : toStructName(page.slug),
    };
  });

  return {
    pages,
    navigationLinks: links,
    assetFiles: config.assets.map((asset) => ({
      path: `static/assets/${asset.path}`,
      content: asset.content,
      mediaType: asset.mediaType,
    })),
  };
}

const ASKAMA_PREVIEW_CSS = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-height: 100vh; background: var(--color-background); color: var(--color-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
a { color: inherit; text-decoration: none; }
.preview-page + .preview-page { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--color-border); }
.topbar { display: flex; align-items: center; justify-content: space-between; min-height: 68px; padding: 0 2rem;
  background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.brand { display: inline-flex; align-items: center; gap: 0.75rem; font-weight: 700; }
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 10px;
  background: var(--color-accent); color: #fff; font-size: 0.8rem; }
.menu-button { display: none; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface);
  color: var(--color-text); padding: 0.55rem 0.9rem; cursor: pointer; font: inherit; }
.theme-toggle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px;
  border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface);
  color: var(--color-text); cursor: pointer; font-size: 1rem; }
.topbar-actions { display: inline-flex; align-items: center; gap: 0.5rem; }
.app-body { width: 100%; max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid;
  grid-template-columns: 220px minmax(0, 1fr); gap: 3rem; }
.navigation { display: flex; flex-direction: column; gap: 0.5rem; }
.navigation a { padding: 0.65rem 0.8rem; border-radius: 8px; color: var(--color-text-muted); }
.navigation a[aria-current="page"] { background: var(--color-surface); color: var(--color-text); font-weight: 600; }
.hero { padding: clamp(2rem, 6vw, 5rem) 0; }
.eyebrow { margin-bottom: 0.75rem; color: var(--color-accent); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; }
.hero h1, .page-header h1 { max-width: 780px; margin: 0; font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.08; letter-spacing: -0.03em; }
.hero-copy { max-width: 680px; margin: 1.5rem 0 0; color: var(--color-text-muted); font-size: 1.1rem; }
.hero-actions { margin-top: 2rem; }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
  padding: 0.7rem 1rem; border-radius: 8px; font-weight: 600; }
.button-primary { background: var(--color-accent); color: #fff; }
.page-header { margin-bottom: 2rem; }
.page-header h1 { font-size: clamp(2rem, 4vw, 3rem); }
.page-header p { color: var(--color-text-muted); }
.card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.card { padding: 1.5rem; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; box-shadow: 0 1px 3px rgba(41, 37, 34, 0.08); }
.footer { max-width: 1200px; margin: 0 auto; padding: 1.5rem 2rem; display: flex; justify-content: space-between;
  gap: 1rem; color: var(--color-text-muted); font-size: 0.85rem; border-top: 1px solid var(--color-border); }
@media (max-width: 760px) { .app-body { display: block; padding: 1rem; } .menu-button { display: inline-flex; }
  .navigation:not(.open) { display: none; }
  .card-grid, .gallery-grid { grid-template-columns: 1fr; } .footer { flex-direction: column; } }
`;

const ASKAMA_PREVIEW_TOKENS = `:root {
    --color-background: #f5f3f0;
    --color-surface: #ffffff;
    --color-surface-muted: #ebe7e2;
    --color-border: #ded8d1;
    --color-text: #292522;
    --color-text-muted: #716b65;
    --color-accent: #8b4513;
    --color-accent-hover: #73380f;
    --shadow-sm: 0 1px 3px rgba(41, 37, 34, 0.08);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-8: 3rem;
    --content-width: 1200px;
}`;

/**
 * Interactions de l'aperçu : menu burger, navigation par ancres interceptée
 * (défilement doux sans rechargement de l'iframe) et liens hors page inertes.
 */
const ASKAMA_PREVIEW_JS = `<script>
document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => {
  const nav = document.querySelector('[data-navigation]');
  const button = document.querySelector('[data-menu-toggle]');
  if (!nav || !button) return;
  const open = nav.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
});
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
});
document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  if (!link) return;
  const href = link.getAttribute('href') ?? '';
  const id = href.startsWith('#') ? href.slice(1) : '';
  const target = id ? document.getElementById(id) : null;
  event.preventDefault();
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const nav = document.querySelector('[data-navigation]');
  const button = document.querySelector('[data-menu-toggle]');
  nav?.classList.remove('open');
  button?.setAttribute('aria-expanded', 'false');
});
</script>`;

/**
 * Aperçu éditeur de la cible Askama : document HTML autonome utilisant les
 * mêmes renderers de blocs et le même langage visuel que le scaffold généré.
 * Toutes les pages sont empilées et accessibles par ancres (navigation
 * cliquable), et le mode de navigation configuré (latéral ou burger) est
 * respecté — le burger s'appliquant aussi au format mobile en mode latéral.
 */
export function renderAskamaUiUxPreview(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  selectedSlug?: string,
  mode: 'light' | 'dark' = 'light',
): string {
  const pages = sortStaticWebPages(config.pages);
  const activePage = pages.find((page) => page.slug === selectedSlug) ?? pages[0];
  const tokens = applyUiUxThemeToTokensCss(ASKAMA_PREVIEW_TOKENS, config);
  const body = pages
    .map(
      (page) =>
        `<section class="preview-page" id="${escapeHtml(page.slug)}">${renderUiUxPageBodyHtml(blockContext(spec, config, page), UI_UX_PREVIEW_STRATEGY)}</section>`,
    )
    .join('');
  const navigation = [
    ...pages.map((page) => {
      const current = activePage && page.id === activePage.id ? ' aria-current="page"' : '';
      return `<a href="#${escapeHtml(page.slug)}"${current}>${escapeHtml(page.title)}</a>`;
    }),
    '<a href="#top">Tableau de bord</a>',
  ].join('');
  const menuButton = `<button class="menu-button" type="button" data-menu-toggle aria-expanded="false" aria-controls="preview-navigation">Menu</button>`;
  const themeToggle = `<button class="theme-toggle" type="button" data-theme-toggle aria-label="Changer de thème">◐</button>`;
  return `<!doctype html>
<html lang="fr" data-theme="${mode === 'dark' ? 'dark' : 'light'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(activePage?.title ?? spec.project.name)}</title><style>${tokens}${ASKAMA_PREVIEW_CSS}${uiUxAskamaSupplementaryCss(config)}</style></head>
<body><div class="app-shell" id="top"><header class="topbar"><a class="brand" href="#top"><span class="brand-mark">SF</span><span>${escapeHtml(spec.project.name)}</span></a><span class="topbar-actions">${themeToggle}${menuButton}</span></header><div class="app-body"><nav id="preview-navigation" class="navigation" data-navigation aria-label="Navigation principale">${navigation}</nav><main class="main-content">${body}</main></div><footer class="footer"><span>${escapeHtml(spec.project.name)}</span><span>Generated by SpecForge</span></footer></div>${ASKAMA_PREVIEW_JS}</body></html>`;
}

function askamaImplementation(
  brickId: string,
): ProjectUiUxBrickImplementation {
  return {
    brickId,
    target: 'askama',
    render: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      escapeAskamaDelimiters(renderUiUxBlockHtml(block, ctx, ASKAMA_SCAFFOLD_STRATEGY)),
    renderPreview: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      renderUiUxBlockHtml(block, ctx, UI_UX_PREVIEW_STRATEGY),
  };
}

export const ASKAMA_BRICK_IMPLEMENTATIONS: ProjectUiUxBrickImplementation[] = [
  'hero',
  'text-content',
  'features',
  'gallery',
  'testimonials',
  'call-to-action',
].map(askamaImplementation);
