/**
 * SpecForge Core — Implémentation UI/UX native Dioxus (Rust, mobile/desktop)
 *
 * Alimente l'interface Dioxus du template mobile à partir de la configuration
 * UI/UX commune : pages rendues en HTML natif embarqué via le mécanisme
 * `dangerous_inner_html` de Dioxus, navigation du tiroir dérivée des pages,
 * thème injecté dans 'assets/main.css'. Aucun site HTML parallèle n'est produit.
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
import { deriveUiUxPalette, hexColor, mixHex, UiUxPalette } from '../theme';
import {
  renderUiUxBlockHtml,
  renderUiUxPageBodyHtml,
  UI_UX_PREVIEW_STRATEGY,
  UiUxHtmlRenderStrategy,
} from './html-blocks';

/**
 * Application mobile sans routes HTTP : les liens inter-pages deviennent des
 * ancres in-app et les assets importés ne sont pas embarqués (le bundle mobile
 * ne sert pas de dossier public) — les images de galerie restent inline.
 */
export const DIOXUS_SCAFFOLD_STRATEGY: UiUxHtmlRenderStrategy = {
  mode: 'scaffold',
  pageHref: (slug) => `#${slug}`,
  assetPrefix: 'assets/',
};

/** Échappe un HTML pour une chaîne Rust (constantes &str du scaffold). */
export function escapeRustString(html: string): string {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/** Rendu RSX d'un bloc : markup HTML commun embarqué via dangerous_inner_html. */
function renderDioxusBlockRsx(
  block: ProjectUiUxBlock,
  ctx: ProjectUiUxBlockRenderContext,
  indent: string,
): string {
  const html = renderUiUxBlockHtml(block, ctx, DIOXUS_SCAFFOLD_STRATEGY);
  return `${indent}section { class: "content-section", "data-brick": "${escapeHtml(block.brickId)}", dangerous_inner_html: "${escapeRustString(html)}" }`;
}

export interface DioxusUiUxPage {
  slug: string;
  title: string;
  /** HTML du corps de page (chaîne Rust échappée). */
  bodyHtml: string;
}

export interface DioxusUiUxRender {
  pages: DioxusUiUxPage[];
  /** Constante Rust des pages, à insérer dans src/main.rs. */
  pagesConst: string;
  /** Surcharges CSS à ajouter à 'assets/main.css'. */
  supplementaryCss: string;
}

/** Rendu complet des pages configurées pour le composant Dioxus natif. */
export function renderDioxusUiUx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
): DioxusUiUxRender {
  const sorted = sortStaticWebPages(config.pages);
  const pages: DioxusUiUxPage[] = sorted.map((page) => ({
    slug: page.slug,
    title: page.title,
    bodyHtml: renderUiUxPageBodyHtml({ spec, config, page }, DIOXUS_SCAFFOLD_STRATEGY),
  }));

  const entries = pages
    .map((page) => `    ("${escapeRustString(page.title)}", "${escapeRustString(page.bodyHtml)}"),`)
    .join('\n');

  return {
    pages,
    pagesConst: `const UI_UX_PAGES: &[(&str, &str)] = &[\n${entries}\n];`,
    supplementaryCss: uiUxDioxusThemeCss(config),
  };
}

/**
 * Injecte le thème UI/UX dans les tokens CSS natifs du template Dioxus
 * (thème sombre de 'assets/main.css').
 */
function dioxusThemeVars(palette: UiUxPalette): string {
  const rgb = (value: string) => {
    const safe = hexColor(value, '#000000').slice(1);
    return [0, 2, 4].map((offset) => parseInt(safe.slice(offset, offset + 2), 16)).join(', ');
  };
  return `  --background: ${palette.background};
  --surface-1: ${palette.surface};
  --surface-2: ${palette.surfaceMuted};
  --surface-hover: ${palette.surfaceHover};
  --surface-raised: ${palette.surface};
  --text-primary: ${palette.text};
  --text-secondary: ${palette.textMuted};
  --text-muted: ${mixHex(palette.text, palette.background, 0.48)};
  --accent: ${palette.primary};
  --accent-soft: rgba(${rgb(palette.primary)}, 0.12);
  --accent-orange: ${palette.accent};
  --accent-orange-soft: rgba(${rgb(palette.accent)}, 0.12);
  --border: ${palette.border};
  --border-strong: ${mixHex(palette.border, palette.text, 0.35)};`;
}

export function uiUxDioxusThemeCss(config: ProjectUiUxConfig): string {
  return `
/* UI/UX : thème configuré dans SpecForge — palette sombre par défaut, palette
   claire activée par l'interrupteur de thème embarqué (data-theme). */
:root {
${dioxusThemeVars(deriveUiUxPalette(config.theme, 'dark'))}
}

.app-shell[data-theme="light"] {
${dioxusThemeVars(deriveUiUxPalette(config.theme, 'light'))}
}

/* UI/UX : le conteneur applicatif porte le fond et le texte du thème actif. */
.app-shell {
  background: var(--background);
  color: var(--text-primary);
}

/* UI/UX : panneau déroulant standard du tiroir — identique sur toutes les cibles. */
.drawer-overlay {
  background: rgb(0 0 0 / 45%);
}

.drawer-header,
.drawer-content {
  width: 300px;
  max-width: 85vw;
}

.drawer-content {
  height: 100%;
  box-shadow: 0 12px 32px rgb(0 0 0 / 18%);
}

/* UI/UX : sections de contenu et blocs configurés dans SpecForge. */
.hero { padding: 1.5rem 0; }
.eyebrow { margin-bottom: 0.75rem; color: var(--accent); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.hero h1, .page-header h1 { margin: 0; font-size: 1.7rem; line-height: 1.15; letter-spacing: -0.02em; color: var(--text-primary); }
.hero-copy { margin: 0.9rem 0 0; color: var(--text-secondary); }
.hero-actions { margin-top: 1.2rem; }
.button { display: block; padding: 12px 16px; border-radius: var(--radius-control); font-weight: 600; text-align: center; text-decoration: none; }
.button-primary { background: var(--accent-soft); color: var(--text-primary); border: 1px solid var(--accent); }
.page-header { margin-bottom: 1.2rem; }
.page-header p { color: var(--text-secondary); }
.content-section { margin-bottom: 1.6rem; }
.content-section > h2 { margin: 0 0 0.8rem; font-size: 1.25rem; color: var(--text-primary); }
.content-section h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
.content-section p, .content-section li { color: var(--text-secondary); font-size: 0.92rem; }
.content-section a { color: var(--accent); }
.content-section img { max-width: 100%; border-radius: var(--radius-card); }
.content-section pre { overflow-x: auto; padding: 0.9rem; background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius-control); font-size: 0.82rem; }
.content-section blockquote { margin: 0.9rem 0; padding-left: 0.9rem; border-left: 3px solid var(--accent-orange); color: var(--text-secondary); }
.content-section table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.content-section th, .content-section td { padding: 0.45rem 0.6rem; border: 1px solid var(--border); text-align: left; color: var(--text-secondary); }
.content-section th { color: var(--text-primary); }
.card-grid, .gallery-grid { display: flex; flex-direction: column; gap: 0.8rem; }
.gallery-grid img { width: 100%; border-radius: var(--radius-control); border: 1px solid var(--border); }
.uiux-testimonial blockquote { margin: 0 0 0.6rem; font-size: 1.02rem; color: var(--text-primary); }
.uiux-cta { padding: 1.2rem; background: linear-gradient(135deg, var(--surface-raised), var(--surface-1)); border: 1px solid var(--border); border-radius: var(--radius-card); text-align: center; }
.uiux-cta .button { margin-top: 0.9rem; }
`;
}

/** Texte RSX : échappe les guillemets et double les accolades (format Dioxus). */
function rsxText(value: string): string {
  const escaped = value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
  return `"${escaped}"`;
}

/**
 * Composant racine Dioxus natif alimenté par la configuration UI/UX : tiroir de
 * navigation piloté par les pages configurées, contenu rendu via le mécanisme
 * dangerous_inner_html de Dioxus, carte compteur métier préservée.
 */
export function renderDioxusMainRs(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
): string {
  const { pagesConst } = renderDioxusUiUx(spec, config);
  return `use dioxus::prelude::*;

const MAIN_CSS: Asset = asset!("/assets/main.css");

${pagesConst}

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut count = use_signal(|| 0);
    let mut menu_open = use_signal(|| false);
    let mut page = use_signal(|| 0usize);
    let mut theme = use_signal(|| "dark");

    rsx! {
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        div { class: "app-shell", "data-theme": "{theme}",
            header { class: "topbar",
                button {
                    class: "icon-btn",
                    aria_label: "Ouvrir le menu",
                    onclick: move |_| menu_open.set(true),
                    "☰"
                }
                div { class: "brand",
                    span { class: "brand-dots",
                        span { class: "dot-cyan" }
                        span { class: "dot-orange" }
                    }
                    span { ${rsxText(spec.project.name)} }
                }
                button {
                    class: "icon-btn",
                    aria_label: "Changer de thème",
                    onclick: move |_| theme.set(if *theme.read() == "dark" { "light" } else { "dark" }),
                    if *theme.read() == "dark" { "☀" } else { "◐" }
                }
            }

            if *menu_open.read() {
                div { class: "drawer-overlay",
                    div { class: "drawer-header",
                        div { class: "brand",
                            span { class: "brand-dots",
                                span { class: "dot-cyan" }
                                span { class: "dot-orange" }
                            }
                            span { "Navigation" }
                        }
                        button {
                            class: "icon-btn",
                            aria_label: "Fermer le menu",
                            onclick: move |_| menu_open.set(false),
                            "✕"
                        }
                    }
                    div { class: "drawer-content",
                        for (index, entry) in UI_UX_PAGES.iter().enumerate() {
                            button {
                                class: if *page.read() == index { "hub-button active" } else { "hub-button" },
                                key: "{entry.0}",
                                onclick: move |_| {
                                    page.set(index);
                                    menu_open.set(false);
                                },
                                "{entry.0}"
                            }
                        }
                    }
                }
            }

            main { class: "main-content",
                section {
                    class: "card",
                    dangerous_inner_html: UI_UX_PAGES[*page.read()].1,
                }
                section { class: "card card-orange",
                    div { class: "card-header", "État & Compteur" }
                    p { "Valeur du compteur : {count}" }
                    button {
                        class: "btn-primary",
                        onclick: move |_| count += 1,
                        "Incrémenter"
                    }
                }
            }
        }
    }
}
`;
}

const DIOXUS_PREVIEW_CSS = `
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--background); color: var(--text-primary);
  font-family: Inter, system-ui, -apple-system, sans-serif; line-height: 1.5; }
a { color: inherit; text-decoration: none; }
.mobile-frame { max-width: 420px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column;
  border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
.topbar { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
  background: var(--surface-1); border-bottom: 1px solid var(--border); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.05rem; }
.brand-dots { display: inline-flex; gap: 4px; }
.brand-dots span { width: 8px; height: 8px; border-radius: 3px; background: var(--accent); }
.brand-dots span + span { background: var(--accent-orange); }
.navigation { display: flex; flex-direction: column; gap: 0.4rem; }
.navigation a { padding: 0.6rem 0.8rem; border-radius: 10px; color: var(--text-secondary); font-size: 0.9rem; }
.navigation a[aria-current="page"] { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.icon-button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;
  border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 1.05rem; }
.icon-button:active { background: var(--surface-2); color: var(--text-primary); }
/* Panneau déroulant standard, identique sur toutes les cibles. */
.drawer { position: fixed; inset: 0; z-index: 50; display: none; background: rgb(0 0 0 / 45%); }
.drawer.open { display: block; }
.drawer-panel { width: 300px; max-width: 85vw; height: 100%; display: flex; flex-direction: column;
  background: var(--surface-1); box-shadow: 0 12px 32px rgb(0 0 0 / 18%); }
.drawer-head { height: 60px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 1px solid var(--border); }
.drawer-content { flex: 1; padding: 18px; overflow-y: auto; }
.main-content { padding: 20px 18px; }
.preview-page + .preview-page { margin-top: 2.4rem; padding-top: 1.6rem; border-top: 1px solid var(--border); }
`;

/**
 * Interactions de l'aperçu Dioxus : tiroir de navigation, navigation par
 * ancres interceptée (défilement doux sans rechargement de l'iframe) et liens
 * hors page inertes.
 */
const DIOXUS_PREVIEW_JS = `<script>
document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => {
  document.querySelector('[data-drawer]')?.classList.add('open');
});
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  shell.dataset.theme = shell.dataset.theme === 'dark' ? 'light' : 'dark';
});
document.querySelector('[data-drawer-close]')?.addEventListener('click', () => {
  document.querySelector('[data-drawer]')?.classList.remove('open');
});
document.querySelector('[data-drawer]')?.addEventListener('click', (event) => {
  if (event.target === document.querySelector('[data-drawer]')) {
    document.querySelector('[data-drawer]')?.classList.remove('open');
  }
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
  document.querySelector('[data-drawer]')?.classList.remove('open');
});
</script>`;

const DIOXUS_PREVIEW_TOKENS = `:root {
  --background: #0d1117;
  --surface-1: #151b23;
  --surface-2: #1b232d;
  --surface-hover: #232d38;
  --surface-raised: #202a35;
  --text-primary: #edf3f5;
  --text-secondary: #a7b4bb;
  --text-muted: #71808a;
  --accent: #1aa8c0;
  --accent-soft: rgba(26, 168, 192, 0.12);
  --accent-orange: #f59e0b;
  --accent-orange-soft: rgba(245, 158, 11, 0.12);
  --border: rgba(255, 255, 255, 0.075);
  --border-strong: rgba(255, 255, 255, 0.12);
  --radius-card: 14px;
  --radius-control: 10px;
}`;

/**
 * Aperçu éditeur de la cible Dioxus : document HTML autonome dans un cadre
 * mobile, avec les mêmes renderers de blocs que le scaffold généré.
 */
export function renderDioxusUiUxPreview(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  selectedSlug?: string,
  mode: 'light' | 'dark' = 'dark',
): string {
  const pages = sortStaticWebPages(config.pages);
  const activePage = pages.find((page) => page.slug === selectedSlug) ?? pages[0];
  const body = pages
    .map(
      (page) =>
        `<section class="preview-page" id="${escapeHtml(page.slug)}">${renderUiUxPageBodyHtml({ spec, config, page }, UI_UX_PREVIEW_STRATEGY)}</section>`,
    )
    .join('');
  const navigation = pages
    .map((page) => {
      const current = activePage && page.id === activePage.id ? ' aria-current="page"' : '';
      return `<a href="#${escapeHtml(page.slug)}"${current}>${escapeHtml(page.title)}</a>`;
    })
    .join('');
  const brand = `<span class="brand-dots"><span></span><span></span></span>${escapeHtml(spec.project.name)}`;
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(activePage?.title ?? spec.project.name)}</title><style>${DIOXUS_PREVIEW_TOKENS}${DIOXUS_PREVIEW_CSS}${uiUxDioxusThemeCss(config)}</style></head>
<body><div class="mobile-frame app-shell" data-theme="${mode}"><header class="topbar"><button class="icon-button" type="button" data-menu-toggle aria-label="Ouvrir le menu">☰</button><div class="brand">${brand}</div><button class="icon-button" type="button" data-theme-toggle aria-label="Changer de thème">◐</button></header><div class="drawer" data-drawer><div class="drawer-panel"><div class="drawer-head"><div class="brand">${brand}</div><button class="icon-button" type="button" data-drawer-close aria-label="Fermer le menu">✕</button></div><div class="drawer-content"><nav class="navigation" aria-label="Navigation principale">${navigation}</nav></div></div></div><main class="main-content">${body}</main></div>${DIOXUS_PREVIEW_JS}</body></html>`;
}

function dioxusImplementation(brickId: string): ProjectUiUxBrickImplementation {
  return {
    brickId,
    target: 'dioxus',
    render: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      renderDioxusBlockRsx(block, ctx, ''),
    renderPreview: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      renderUiUxBlockHtml(block, ctx, UI_UX_PREVIEW_STRATEGY),
  };
}

export const DIOXUS_BRICK_IMPLEMENTATIONS: ProjectUiUxBrickImplementation[] = [
  'hero',
  'text-content',
  'features',
  'gallery',
  'testimonials',
  'call-to-action',
].map(dioxusImplementation);
