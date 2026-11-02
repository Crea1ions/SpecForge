/**
 * SpecForge Core — Renderer de blocs HTML partagé (module UI/UX applicatif)
 *
 * Sert de référence visuelle commune : les aperçus de l'éditeur (toutes cibles)
 * et l'implémentation Askama consomment ce markup, avec les classes CSS natives
 * des templates. Les implémentations React (JSX) et Dioxus (RSX) portent leurs
 * propres renderers alignés sur ces mêmes classes.
 */

import {
  ProjectUiUxBlock,
  ProjectUiUxBlockRenderContext,
} from '../../types';
import {
  escapeHtml,
  findAssetPath,
  renderMarkdown,
  resolveMarkdownLink,
  MarkdownRenderOptions,
} from '../../static-web/render';

/**
 * Stratégie de sortie des URLs :
 * - `preview` : ancres locales et assets inline (data URI) pour l'iframe d'aperçu ;
 * - `scaffold` : liens '<slug>.html' / 'assets/...' réécrits vers les routes et
 *   chemins natifs de la cible via `pageHref` et `assetPrefix`.
 */
export interface UiUxHtmlRenderStrategy {
  mode: 'preview' | 'scaffold';
  /** Scaffold : href natif d'une page (ex. '/' ou '/<slug>', '#<slug>'). */
  pageHref?: (slug: string, isFirst: boolean) => string;
  /** Scaffold : préfixe natif des assets (ex. '/static/assets/', '/assets/'). */
  assetPrefix?: string;
}

export const UI_UX_PREVIEW_STRATEGY: UiUxHtmlRenderStrategy = { mode: 'preview' };

export function blockValue(block: ProjectUiUxBlock, key: string, fallback = ''): string {
  const candidate = block.properties[key];
  return typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean'
    ? String(candidate)
    : fallback;
}

export function blockList(block: ProjectUiUxBlock, key: string): string[] {
  const candidate = block.properties[key];
  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === 'string')
    : typeof candidate === 'string'
      ? candidate.split('\n').map((entry) => entry.trim()).filter(Boolean)
      : [];
}

function markdownOptions(
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): MarkdownRenderOptions {
  return {
    page: ctx.page,
    config: ctx.config,
    inlineAssets: strategy.mode === 'preview',
    singlePage: strategy.mode === 'preview',
  };
}

/** Réécrit les liens/assets résolus vers les routes et chemins natifs de la cible. */
export function rewriteTargetUrls(
  html: string,
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  if (strategy.mode === 'preview') return html;
  const pages = [...ctx.config.pages].sort((left, right) => left.order - right.order);
  const firstSlug = pages[0]?.slug;
  let output = html;
  if (strategy.pageHref) {
    for (const page of ctx.config.pages) {
      const href = strategy.pageHref(page.slug, page.slug === firstSlug);
      output = output.replaceAll(`href="${page.slug}.html"`, `href="${href}"`);
    }
  }
  if (strategy.assetPrefix) {
    output = output
      .replaceAll('src="assets/', `src="${strategy.assetPrefix}`)
      .replaceAll('href="assets/', `href="${strategy.assetPrefix}`);
  }
  return output;
}

/** Rendu Markdown du contenu d'une page ou d'un bloc, adapté à la cible de sortie. */
export function renderUiUxMarkdown(
  markdown: string,
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  const html = renderMarkdown(markdown, markdownOptions(ctx, strategy)).html;
  return rewriteTargetUrls(html, ctx, strategy);
}

/** Résout l'URL d'action d'un bloc selon la cible de sortie. */
export function resolveBlockUrl(
  url: string,
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  if (!url) return '';
  const resolved = resolveMarkdownLink(url, markdownOptions(ctx, strategy));
  if (strategy.mode === 'preview') return resolved;
  const rewritten = rewriteTargetUrls(`href="${escapeHtml(resolved)}"`, ctx, strategy);
  return rewritten.startsWith('href="') ? rewritten.slice(6, -1) : resolved;
}

/** Résout le chemin d'un asset importé vers l'URL native ou sa data URI d'aperçu. */
export function resolveAssetUrl(
  source: string,
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  const assetPath = findAssetPath(source, ctx.page, ctx.config);
  if (!assetPath) return '';
  if (strategy.mode === 'preview') {
    const asset = ctx.config.assets.find((candidate) => candidate.path === assetPath);
    return asset ? `data:${asset.mediaType};base64,${asset.content}` : '';
  }
  return `${strategy.assetPrefix ?? '/static/assets/'}${assetPath}`;
}

/** Rendu HTML commun d'un bloc UI/UX (aperçus toutes cibles, markup Askama). */
export function renderUiUxBlockHtml(
  block: ProjectUiUxBlock,
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  switch (block.brickId) {
    case 'hero': {
      const actionLabel = blockValue(block, 'actionLabel');
      const actionUrl = resolveBlockUrl(blockValue(block, 'actionUrl'), ctx, strategy);
      const title = blockValue(block, 'title') || ctx.page.title;
      return `<section class="hero"><div class="eyebrow">${escapeHtml(ctx.page.category || ctx.spec.project.name)}</div><h1>${escapeHtml(title)}</h1><p class="hero-copy">${escapeHtml(blockValue(block, 'subtitle'))}</p>${actionUrl && actionLabel ? `<div class="hero-actions"><a class="button button-primary" href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a></div>` : ''}</section>`;
    }
    case 'text-content':
      return `<section class="content-section"><h2>${escapeHtml(blockValue(block, 'heading', 'Content'))}</h2>${renderUiUxMarkdown(blockValue(block, 'markdown'), ctx, strategy)}</section>`;
    case 'features':
      return `<section class="content-section"><h2>${escapeHtml(blockValue(block, 'heading', 'Features'))}</h2><div class="card-grid">${blockList(block, 'items').map((item) => `<article class="card"><h3>${escapeHtml(item)}</h3></article>`).join('')}</div></section>`;
    case 'gallery':
      return `<section class="content-section uiux-gallery"><h2>${escapeHtml(blockValue(block, 'heading', 'Gallery'))}</h2><div class="gallery-grid">${blockList(block, 'images').map((image) => {
        const src = resolveAssetUrl(image, ctx, strategy);
        return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(image.split('/').pop() ?? 'Gallery image')}" loading="lazy"/>` : '';
      }).join('')}</div></section>`;
    case 'testimonials': {
      const role = blockValue(block, 'role');
      return `<section class="content-section uiux-testimonial"><blockquote>“${escapeHtml(blockValue(block, 'quote'))}”</blockquote><p><strong>${escapeHtml(blockValue(block, 'author'))}</strong>${role ? ` · ${escapeHtml(role)}` : ''}</p></section>`;
    }
    case 'call-to-action': {
      const actionLabel = blockValue(block, 'actionLabel');
      const actionUrl = resolveBlockUrl(blockValue(block, 'actionUrl'), ctx, strategy);
      return `<section class="content-section uiux-cta"><h2>${escapeHtml(blockValue(block, 'title'))}</h2><p>${escapeHtml(blockValue(block, 'text'))}</p>${actionUrl && actionLabel ? `<a class="button button-primary" href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a>` : ''}</section>`;
    }
    default:
      return `<section class="content-section" data-brick="${escapeHtml(block.brickId)}"></section>`;
  }
}

/**
 * Corps de page : blocs (mode layout-driven) puis contenu Markdown, avec un
 * en-tête de page lorsque ni hero ni titre Markdown de niveau 1 ne le portent.
 */
export function renderUiUxPageBodyHtml(
  ctx: ProjectUiUxBlockRenderContext,
  strategy: UiUxHtmlRenderStrategy,
): string {
  const { config, page } = ctx;
  const options = markdownOptions(ctx, strategy);
  const markdown = renderMarkdown(page.markdown, options);
  const hasHero = config.compositionMode === 'layout-driven' &&
    page.blocks.some((block) => block.brickId === 'hero');
  const hasPageTitle = markdown.headings.some(
    (heading) => heading.level === 1 &&
      heading.title.toLocaleLowerCase() === page.title.toLocaleLowerCase(),
  );
  const pageHeading = hasHero || hasPageTitle
    ? ''
    : `<section class="page-header"><div><div class="eyebrow">${escapeHtml(page.category || 'Page')}</div><h1>${escapeHtml(page.title)}</h1>${page.description ? `<p>${escapeHtml(page.description)}</p>` : ''}</div></section>`;

  let content: string;
  if (config.compositionMode === 'layout-driven' && page.blocks.length > 0) {
    const blocks = page.blocks.map((block) => renderUiUxBlockHtml(block, ctx, strategy)).join('\n');
    content = `${blocks}\n${rewriteTargetUrls(markdown.html, ctx, strategy)}`;
  } else {
    content = rewriteTargetUrls(markdown.html, ctx, strategy);
  }
  return `${pageHeading}${content}`;
}
