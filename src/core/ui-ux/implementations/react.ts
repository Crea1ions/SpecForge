/**
 * SpecForge Core — Implémentation UI/UX native React (Vite, SPA)
 *
 * Alimente l'interface React/Vite des templates applicatifs (web-platform,
 * frontend-only, desktop/Tauri) à partir de la configuration UI/UX commune :
 * pages rendues comme composants, navigation par état React, thème injecté
 * dans les tokens CSS, assets servis depuis 'frontend/public/assets/'.
 * Aucun site HTML parallèle n'est produit.
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
  blockList,
  blockValue,
  renderUiUxBlockHtml,
  renderUiUxMarkdown,
  renderUiUxPageBodyHtml,
  resolveAssetUrl,
  resolveBlockUrl,
  UI_UX_PREVIEW_STRATEGY,
  UiUxHtmlRenderStrategy,
} from './html-blocks';

/** Navigation SPA par état React : ancres '#<slug>' et assets servis par Vite. */
export const REACT_SCAFFOLD_STRATEGY: UiUxHtmlRenderStrategy = {
  mode: 'scaffold',
  pageHref: (slug) => `#${slug}`,
  assetPrefix: '/assets/',
};

/** Échappe un texte pour un nœud texte JSX (accolades comprises). */
function escapeJsxText(value: string): string {
  return escapeHtml(value).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

/** Échappe un HTML pour un template literal JS (dangerouslySetInnerHTML). */
function escapeJsTemplateLiteral(html: string): string {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function renderReactBlockJsx(
  block: ProjectUiUxBlock,
  ctx: ProjectUiUxBlockRenderContext,
  indent: string,
): string {
  switch (block.brickId) {
    case 'hero': {
      const actionLabel = blockValue(block, 'actionLabel');
      const actionUrl = resolveBlockUrl(blockValue(block, 'actionUrl'), ctx, REACT_SCAFFOLD_STRATEGY);
      const title = blockValue(block, 'title') || ctx.page.title;
      const eyebrow = ctx.page.category || ctx.spec.project.name;
      return `${indent}<section className="hero">
${indent}  <div className="eyebrow">${escapeJsxText(eyebrow)}</div>
${indent}  <h1>${escapeJsxText(title)}</h1>
${indent}  <p className="hero-copy">${escapeJsxText(blockValue(block, 'subtitle'))}</p>
${actionUrl && actionLabel ? `${indent}  <div className="hero-actions"><a className="button button-primary" href="${escapeHtml(actionUrl)}">${escapeJsxText(actionLabel)}</a></div>\n` : ''}${indent}</section>`;
    }
    case 'text-content': {
      const html = escapeJsTemplateLiteral(renderUiUxMarkdown(blockValue(block, 'markdown'), ctx, REACT_SCAFFOLD_STRATEGY));
      return `${indent}<section className="content-section">
${indent}  <h2>${escapeJsxText(blockValue(block, 'heading', 'Content'))}</h2>
${indent}  <div dangerouslySetInnerHTML={{ __html: \`${html}\` }} />
${indent}</section>`;
    }
    case 'features':
      return `${indent}<section className="content-section">
${indent}  <h2>${escapeJsxText(blockValue(block, 'heading', 'Features'))}</h2>
${indent}  <div className="card-grid">
${blockList(block, 'items').map((item) => `${indent}    <article className="card"><h3>${escapeJsxText(item)}</h3></article>`).join('\n')}
${indent}  </div>
${indent}</section>`;
    case 'gallery':
      return `${indent}<section className="content-section uiux-gallery">
${indent}  <h2>${escapeJsxText(blockValue(block, 'heading', 'Gallery'))}</h2>
${indent}  <div className="gallery-grid">
${blockList(block, 'images').map((image) => {
        const src = resolveAssetUrl(image, ctx, REACT_SCAFFOLD_STRATEGY);
        return src ? `${indent}    <img src="${escapeHtml(src)}" alt="${escapeHtml(image.split('/').pop() ?? 'Gallery image')}" loading="lazy" />` : '';
      }).filter(Boolean).join('\n')}
${indent}  </div>
${indent}</section>`;
    case 'testimonials': {
      const role = blockValue(block, 'role');
      return `${indent}<section className="content-section uiux-testimonial">
${indent}  <blockquote>“${escapeJsxText(blockValue(block, 'quote'))}”</blockquote>
${indent}  <p><strong>${escapeJsxText(blockValue(block, 'author'))}</strong>${role ? ` · ${escapeJsxText(role)}` : ''}</p>
${indent}</section>`;
    }
    case 'call-to-action': {
      const actionLabel = blockValue(block, 'actionLabel');
      const actionUrl = resolveBlockUrl(blockValue(block, 'actionUrl'), ctx, REACT_SCAFFOLD_STRATEGY);
      return `${indent}<section className="content-section uiux-cta">
${indent}  <h2>${escapeJsxText(blockValue(block, 'title'))}</h2>
${indent}  <p>${escapeJsxText(blockValue(block, 'text'))}</p>
${actionUrl && actionLabel ? `${indent}  <a className="button button-primary" href="${escapeHtml(actionUrl)}">${escapeJsxText(actionLabel)}</a>\n` : ''}${indent}</section>`;
    }
    default:
      return `${indent}<section className="content-section" data-brick="${escapeHtml(block.brickId)}" />`;
  }
}

/** Corps de page JSX : blocs (layout-driven) puis contenu Markdown. */
export function renderReactPageBodyJsx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  page: ProjectUiUxPage,
  indent = '        ',
): string {
  const ctx: ProjectUiUxBlockRenderContext = { spec, config, page };
  const markdownHtml = escapeJsTemplateLiteral(renderUiUxMarkdown(page.markdown, ctx, REACT_SCAFFOLD_STRATEGY));
  const hasHero = config.compositionMode === 'layout-driven' &&
    page.blocks.some((block) => block.brickId === 'hero');
  const hasPageTitle = /^\s*#\s+/.test(page.markdown) &&
    (page.markdown.match(/^\s*#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim().toLocaleLowerCase() === page.title.toLocaleLowerCase());
  const pageHeading = hasHero || hasPageTitle
    ? ''
    : `${indent}<section className="page-header"><div className="eyebrow">${escapeJsxText(page.category || 'Page')}</div><h1>${escapeJsxText(page.title)}</h1>${page.description ? `<p>${escapeJsxText(page.description)}</p>` : ''}</section>\n`;

  const parts: string[] = [];
  if (config.compositionMode === 'layout-driven' && page.blocks.length > 0) {
    parts.push(page.blocks.map((block) => renderReactBlockJsx(block, ctx, indent)).join('\n'));
  }
  if (markdownHtml) {
    parts.push(`${indent}<div className="content-section" dangerouslySetInnerHTML={{ __html: \`${markdownHtml}\` }} />`);
  }
  return `${pageHeading}${parts.join('\n')}`;
}

function rgbComponents(value: string): string {
  const safe = hexColor(value, '#000000').slice(1);
  return [0, 2, 4].map((offset) => parseInt(safe.slice(offset, offset + 2), 16)).join(', ');
}

/** Surcharge complète d'un mode : palette dérivée garantissant le contraste. */
function reactThemeVars(palette: UiUxPalette): string {
  const textMuted = mixHex(palette.text, palette.background, 0.48);
  const borderStrong = mixHex(palette.border, palette.text, 0.35);
  return `  --background: ${palette.background};
  --surface-1: ${palette.surface};
  --surface-2: ${palette.surfaceMuted};
  --surface-hover: ${palette.surfaceHover};
  --surface-raised: ${palette.surface};
  --text-primary: ${palette.text};
  --text-secondary: ${palette.textMuted};
  --text-muted: ${textMuted};
  --accent: ${palette.primary};
  --accent-hover: ${palette.primaryHover};
  --accent-soft: rgba(${rgbComponents(palette.primary)}, 0.12);
  --accent-orange: ${palette.accent};
  --accent-orange-soft: rgba(${rgbComponents(palette.accent)}, 0.12);
  --border: ${palette.border};
  --border-strong: ${borderStrong};`;
}

/**
 * Surcharges de thème injectées dans 'frontend/src/index.css' : la palette
 * configurée pilote tous les tokens du design system React — fonds, surfaces,
 * bordures et textes dérivés — pour un contraste correct en clair et en sombre.
 */
export function uiUxReactThemeCss(config: ProjectUiUxConfig): string {
  return `
/* UI/UX : thème configuré dans SpecForge. */
:root {
${reactThemeVars(deriveUiUxPalette(config.theme, 'dark'))}
}

:root[data-theme="light"] {
${reactThemeVars(deriveUiUxPalette(config.theme, 'light'))}
}
`;
}

/** Règles CSS des blocs UI/UX ajoutées à 'frontend/src/index.css'. */
export function uiUxReactSupplementaryCss(): string {
  return `
/* UI/UX : sections de contenu et blocs configurés dans SpecForge. */
.hero { padding: clamp(2rem, 6vw, 4rem) 0; }
.eyebrow { margin-bottom: 0.75rem; color: var(--accent); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.hero h1, .page-header h1 { max-width: 780px; margin: 0; font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1.1; letter-spacing: -0.03em; color: var(--text-primary); }
.hero-copy { max-width: 680px; margin: 1.25rem 0 0; color: var(--text-secondary); font-size: 1.05rem; }
.hero-actions { margin-top: 1.5rem; }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0.7rem 1rem; border-radius: var(--radius-control); font-weight: 600; text-decoration: none; }
.button-primary { background: var(--accent); color: #fff; }
.button-primary:hover { background: var(--accent-hover); }
.page-header { margin-bottom: 1.5rem; }
.page-header p { color: var(--text-secondary); }
.content-section { margin-bottom: 2.5rem; }
.content-section > h2 { margin: 0 0 1rem; font-size: clamp(1.3rem, 2.6vw, 1.8rem); letter-spacing: -0.02em; color: var(--text-primary); }
.content-section h3 { margin: 0; font-size: 1.05rem; color: var(--text-primary); }
.content-section p, .content-section li { color: var(--text-secondary); }
.content-section a { color: var(--accent); }
.content-section img { max-width: 100%; border-radius: var(--radius); }
.content-section pre { overflow-x: auto; padding: 1rem; background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); }
.content-section blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid var(--accent); color: var(--text-secondary); }
.content-section table { width: 100%; border-collapse: collapse; }
.content-section th, .content-section td { padding: 0.5rem 0.75rem; border: 1px solid var(--border); text-align: left; color: var(--text-secondary); }
.content-section th { color: var(--text-primary); }
.card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.card { padding: 1.4rem; background: linear-gradient(135deg, var(--surface-raised), var(--surface-1)); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
.gallery-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.gallery-grid img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius); border: 1px solid var(--border); }
.uiux-testimonial blockquote { margin: 0 0 0.75rem; font-size: 1.1rem; color: var(--text-primary); }
.uiux-cta { padding: 2rem; background: linear-gradient(135deg, var(--surface-raised), var(--surface-1)); border: 1px solid var(--border); border-radius: var(--radius); text-align: center; }
.uiux-cta .button { margin-top: 1rem; }
@media (max-width: 900px) { .card-grid, .gallery-grid { grid-template-columns: 1fr; } }
`;
}

export interface ReactUiUxPage {
  slug: string;
  title: string;
  /** Corps JSX de la page. */
  bodyJsx: string;
}

export interface ReactUiUxRender {
  pages: ReactUiUxPage[];
  /** Assets importés à émettre sous 'frontend/public/assets/'. */
  assetFiles: { path: string; content: string; mediaType: string }[];
  /** Surcharges CSS à ajouter à 'frontend/src/index.css'. */
  supplementaryCss: string;
  /** Expression JSX des pages, prêtes à insérer dans App.tsx. */
  pagesJsx: string;
}

/** Rendu complet des pages configurées en composants React natifs. */
export function renderReactUiUx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
): ReactUiUxRender {
  const sorted = sortStaticWebPages(config.pages);
  const pages: ReactUiUxPage[] = sorted.map((page) => ({
    slug: page.slug,
    title: page.title,
    bodyJsx: renderReactPageBodyJsx(spec, config, page),
  }));

  return {
    pages,
    assetFiles: config.assets.map((asset) => ({
      path: `frontend/public/assets/${asset.path}`,
      content: asset.content,
      mediaType: asset.mediaType,
    })),
    supplementaryCss: `${uiUxReactThemeCss(config)}${uiUxReactSupplementaryCss()}`,
    pagesJsx: pages.map((page) => page.bodyJsx).join('\n'),
  };
}

/**
 * Composant racine React natif alimenté par la configuration UI/UX : navigation
 * latérale (ou tiroir burger) pilotée par les pages configurées, contenu rendu
 * en composants, cartes d'état métier préservées sur la page d'accueil.
 */
export function renderReactAppTsx(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  options: { hasHttpBackend: boolean },
): string {
  const render = renderReactUiUx(spec, config);
  const pages = render.pages;
  const burgerNav = config.navigation === 'burger';
  // Interrupteur clair/sombre embarqué par défaut : préférence système au
  // premier lancement, choix persisté ensuite.
  const initialDark = `(() => {
    const stored = localStorage.getItem('specforge-theme');
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  })()`;

  const pagesConst = `const PAGES = [\n${pages
    .map((page) => `  { slug: ${JSON.stringify(page.slug)}, title: ${JSON.stringify(page.title)} },`)
    .join('\n')}\n];`;

  const pagesSections = pages
    .map(
      (page, index) => `        {page === ${index} && (
          <>
${page.bodyJsx}
${index === 0 ? renderReactBusinessSection(spec, options) : ''}          </>
        )}`,
    )
    .join('\n');

  const sidebarNav = `          {PAGES.map((entry, index) => (
            <Nav
              key={entry.slug}
              label={entry.title}
              active={page === index}
              onClick={() => setPage(index)}
            />
          ))}`;

  return `import { useEffect, useState, type ReactNode } from 'react';
import {
  Menu,
  Moon,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';

${pagesConst}

export default function App() {
  const [page, setPage] = useState(0);
  const [health, setHealth] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(${initialDark});
  const [menu, setMenu] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/health');
      if (res.ok) setHealth(await res.json());

      const itemsRes = await fetch('/api/items');
      if (itemsRes.ok) setItems(await itemsRes.json());
    } catch (err) {
      console.warn('Backend en attente...', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      localStorage.setItem('specforge-theme', next ? 'dark' : 'light');
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <aside className="${burgerNav ? 'hidden' : 'fixed left-0 top-0 bottom-0 z-10 w-[260px] border-r border-border bg-gradient-to-b from-surface-1 to-surface-2 px-[18px] py-6 shadow-[8px_0_30px_rgba(0,0,0,0.08)] max-[900px]:hidden'}">
        <div className="mb-[34px] flex items-center px-2 text-xl font-extrabold tracking-[-0.03em] text-text-primary">
          <span className="mr-2 inline-flex gap-1">
            <span className="h-2 w-2 rounded-[3px] bg-accent" />
            <span className="h-2 w-2 rounded-[3px] bg-accent-orange" />
          </span>
          ${escapeJsxText(spec.project.name)}
        </div>

        <nav className="flex flex-col gap-1">
${sidebarNav}
        </nav>

        <div className="mt-6 px-2">
          <Nav
            label={dark ? 'Thème clair' : 'Thème sombre'}
            onClick={toggleTheme}
          />
        </div>
      </aside>

      <header className="${burgerNav ? 'flex' : 'hidden'} fixed left-0 right-0 top-0 z-[15] h-[60px] items-center justify-between border-b border-border bg-surface-1/90 px-[14px] py-2 backdrop-blur-md${burgerNav ? '' : ' max-[900px]:flex'}">
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label="Ouvrir le menu"
          className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-transparent text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>

        <strong className="text-[15px] tracking-[-0.02em]">
          ${escapeJsxText(spec.project.name)}
        </strong>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
          className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-surface-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {menu && (
        <div
          className="fixed inset-0 z-20 bg-black/45"
          onClick={() => setMenu(false)}
        >
          <div
            className="flex h-full w-[300px] max-w-[85vw] flex-col gap-2 overflow-y-auto bg-surface-1 p-[18px] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-[18px] flex justify-end">
              <button
                type="button"
                onClick={() => setMenu(false)}
                aria-label="Fermer le menu"
                className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-surface-2 text-text-secondary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {PAGES.map((entry, index) => (
              <Nav
                key={entry.slug}
                label={entry.title}
                active={page === index}
                onClick={() => {
                  setPage(index);
                  setMenu(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <main className="min-h-screen${burgerNav ? '' : ' ml-[260px]'} px-12 pb-[52px] ${burgerNav ? 'pt-[88px]' : 'py-[52px]'} max-[900px]:ml-0 max-[900px]:px-5 max-[900px]:pb-10 max-[900px]:pt-[88px]">
${pagesSections}
      </main>
    </div>
  );
}

function Nav({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 rounded-control border px-3 py-[10px] text-left text-sm transition-[background,border-color,color,transform] duration-150 ' +
        (active
          ? 'border-accent/20 bg-accent-soft text-text-primary'
          : 'border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary') +
        ' active:translate-y-px'
      }
    >
      <span>{label}</span>
    </button>
  );
}

function Card({
  title,
  accent = 'accent',
  children,
}: {
  title: string;
  accent?: 'accent' | 'orange';
  children: ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-gradient-to-br from-surface-raised to-surface-1 p-[22px] shadow-card transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong before:absolute before:left-[22px] before:top-0 before:h-[2px] before:w-[34px] before:rounded-b-[3px] before:bg-accent">
      <div
        className={
          'mb-4 flex items-center gap-2 text-xs font-bold ' +
          (accent === 'orange' ? 'text-accent-orange' : 'text-accent')
        }
      >
        {title}
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        {children}
      </div>
    </article>
  );
}
`;
}

/** Cartes d'état métier préservées sur la page d'accueil (valeurs injectées à la génération). */
function renderReactBusinessSection(
  spec: ProjectSpecification,
  options: { hasHttpBackend: boolean },
): string {
  return `            <section className="grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-1 max-[900px]:gap-3">
              <Card title="Backend" accent="accent">
                <p>
                  Runtime : <strong>${spec.backend.language.toUpperCase()}</strong>
                </p>
                <p>
                  Port : <strong>${spec.backend.port}</strong>
                </p>
                <p>
                  État : <strong>{health?.status ?? '${options.hasHttpBackend ? 'En attente' : 'Aucun backend HTTP'}'}</strong>
                </p>
              </Card>

              <Card title="Persistance" accent="orange">
                <p>
                  Type : <strong>${spec.database.enabled ? spec.database.type.toUpperCase() : 'Aucune'}</strong>
                </p>
                <p>
                  Éléments chargés : <strong>{items.length}</strong>
                </p>
              </Card>

              <Card title="Authentification" accent="accent">
                <p>
                  Provider : <strong>${spec.authentication.enabled ? spec.authentication.provider.toUpperCase() : 'Désactivée'}</strong>
                </p>
              </Card>
            </section>
            <div className="mt-6">
              <button
                type="button"
                onClick={fetchStatus}
                className="flex shrink-0 items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-text-primary"
              >
                <RefreshCw
                  className={loading
                    ? 'h-4 w-4 animate-spin motion-reduce:animate-none'
                    : 'h-4 w-4'}
                />
                Rafraîchir
              </button>
            </div>
`;
}

/**
 * Thème UI/UX pour la vitrine e-commerce (template piloté par les données
 * métier) : surcharge des tokens natifs de 'frontend/src/index.css', sans
 * toucher aux pages ni aux flux métier. Clair et sombre.
 */
export function uiUxEcommerceThemeCss(config: ProjectUiUxConfig): string {
  const theme = config.theme;
  const hex = (value: string, fallback: string) => (/^#[\da-f]{6}$/i.test(value) ? value : fallback);
  return `
/* UI/UX : thème configuré dans SpecForge. */
:root {
  --bg: ${hex(theme.background, '#f5f2ec')};
  --ink: ${hex(theme.text, '#222a25')};
  --brand: ${hex(theme.primary, '#2f5a4b')};
  --accent: ${hex(theme.accent, '#c47b55')};
}

body.theme-dark {
  --bg: ${hex(theme.darkBackground, '#151b18')};
  --ink: ${hex(theme.darkText, '#edf0e9')};
  --brand: ${hex(theme.primary, '#9ab9a6')};
  --accent: ${hex(theme.accent, '#d69a76')};
}
`;
}

const REACT_PREVIEW_CSS = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-height: 100vh; background: var(--background); color: var(--text-primary);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
a { color: inherit; text-decoration: none; }
.preview-page + .preview-page { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.app-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 100vh; }
.sidebar { border-right: 1px solid var(--border); background: linear-gradient(180deg, var(--surface-1), var(--surface-2)); padding: 1.4rem 1rem; }
.brand { display: flex; align-items: center; gap: 0.6rem; font-weight: 800; font-size: 1.05rem; margin-bottom: 1.6rem; }
.brand-dots { display: inline-flex; gap: 4px; }
.brand-dots span { width: 8px; height: 8px; border-radius: 3px; background: var(--accent); }
.brand-dots span + span { background: var(--accent-orange); }
.navigation { display: flex; flex-direction: column; gap: 0.35rem; }
.navigation a { padding: 0.6rem 0.8rem; border-radius: 10px; color: var(--text-secondary); font-size: 0.9rem; }
.navigation a[aria-current="page"] { background: var(--accent-soft); color: var(--text-primary); font-weight: 600; }
.main { padding: 2.4rem 3rem; }
.icon-button { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
  border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 1.1rem; }
.icon-button:hover { background: var(--surface-hover); color: var(--text-primary); }
.topbar { display: none; align-items: center; justify-content: space-between; gap: 0.75rem; height: 60px;
  padding: 0 1rem; background: var(--surface-1); border-bottom: 1px solid var(--border); }
.topbar .brand { margin-bottom: 0; }
.topbar-spacer { width: 40px; }
.app-layout.nav-burger { display: block; }
.app-layout.nav-burger .topbar { display: flex; }
.app-layout.nav-burger .main { padding-top: 1.8rem; }
/* Panneau déroulant standard, identique sur toutes les cibles. */
.drawer { position: fixed; inset: 0; z-index: 50; display: none; background: rgb(0 0 0 / 45%); }
.drawer.open { display: block; }
.drawer-panel { width: 300px; max-width: 85vw; height: 100%; overflow-y: auto; display: flex; flex-direction: column;
  gap: 0.5rem; background: var(--surface-1); padding: 1.1rem; box-shadow: 0 12px 32px rgb(0 0 0 / 18%); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.drawer-head .brand { margin-bottom: 0; }
@media (max-width: 900px) { .app-layout { display: block; } .sidebar { display: none; } .topbar { display: flex; }
  .main { padding: 1.2rem; } }
`;

const REACT_PREVIEW_TOKENS = `:root {
  --background: #0d1117;
  --surface-1: #151b23;
  --surface-2: #1b232d;
  --surface-hover: #232d38;
  --surface-raised: #202a35;
  --text-primary: #edf3f5;
  --text-secondary: #a7b4bb;
  --text-muted: #71808a;
  --accent: #1aa8c0;
  --accent-hover: #28c2d8;
  --accent-soft: rgba(26, 168, 192, 0.12);
  --accent-orange: #f59e0b;
  --accent-orange-soft: rgba(245, 158, 11, 0.12);
  --border: rgba(255, 255, 255, 0.075);
  --border-strong: rgba(255, 255, 255, 0.12);
  --radius: 14px;
  --radius-control: 10px;
  --shadow: 0 14px 35px rgba(0, 0, 0, 0.28);
}`;

/**
 * Aperçu éditeur de la cible React : document HTML autonome utilisant les
 * mêmes renderers de blocs et le design system du scaffold React généré.
 */
/**
 * Interactions de l'aperçu React : tiroir burger, navigation par ancres
 * interceptée (défilement doux sans rechargement de l'iframe) et liens hors
 * page inertes.
 */
const REACT_PREVIEW_JS = `<script>
document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => {
  document.querySelector('[data-drawer]')?.classList.add('open');
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

/**
 * Aperçu éditeur de la cible React : document HTML autonome utilisant les
 * mêmes renderers de blocs et le design system du scaffold React généré.
 * Toutes les pages sont empilées et accessibles par ancres (navigation
 * cliquable) ; le mode latéral bascule en burger au format mobile, et le
 * tiroir utilise le panneau déroulant standard.
 */
export function renderReactUiUxPreview(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  selectedSlug?: string,
  mode: 'light' | 'dark' = 'dark',
): string {
  const pages = sortStaticWebPages(config.pages);
  const activePage = pages.find((page) => page.slug === selectedSlug) ?? pages[0];
  const tokens = REACT_PREVIEW_TOKENS;
  const burger = config.navigation === 'burger';
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
  const topbar = `<header class="topbar"><button class="icon-button" type="button" data-menu-toggle aria-label="Ouvrir le menu">☰</button><div class="brand">${brand}</div><span class="topbar-spacer"></span></header>`;
  const drawer = `<div class="drawer" data-drawer><div class="drawer-panel"><div class="drawer-head"><div class="brand">${brand}</div><button class="icon-button" type="button" data-drawer-close aria-label="Fermer le menu">✕</button></div><nav class="navigation" aria-label="Navigation principale">${navigation}</nav></div></div>`;
  const sidebar = burger
    ? ''
    : `<aside class="sidebar"><div class="brand">${brand}</div><nav class="navigation" aria-label="Navigation principale">${navigation}</nav></aside>`;
  return `<!doctype html>
<html lang="fr"${mode === 'light' ? ' data-theme="light"' : ''}>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(activePage?.title ?? spec.project.name)}</title><style>${tokens}${REACT_PREVIEW_CSS}${uiUxReactThemeCss(config)}${uiUxReactSupplementaryCss()}</style></head>
<body><div class="app-layout${burger ? ' nav-burger' : ''}">${topbar}${sidebar}${drawer}<main class="main">${body}</main></div>${REACT_PREVIEW_JS}</body></html>`;
}

function reactImplementation(brickId: string): ProjectUiUxBrickImplementation {
  return {
    brickId,
    target: 'react',
    render: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      renderReactBlockJsx(block, ctx, ''),
    renderPreview: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) =>
      renderUiUxBlockHtml(block, ctx, UI_UX_PREVIEW_STRATEGY),
  };
}

export const REACT_BRICK_IMPLEMENTATIONS: ProjectUiUxBrickImplementation[] = [
  'hero',
  'text-content',
  'features',
  'gallery',
  'testimonials',
  'call-to-action',
].map(reactImplementation);
