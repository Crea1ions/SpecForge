import {
  ApplicationTemplate,
  GeneratedFile,
  StaticWebBlock,
  StaticWebConfig,
  StaticWebPage,
  StaticWebBrickPropertyType,
  ProjectSpecification,
} from '../types';
import { getContentByteLength } from '../utils';
import { getStaticWebBrick } from './bricks';
import { getProjectUiUxConfig } from './config';
import { resolveStaticWebReferencePath, sortStaticWebPages } from './content';

interface MarkdownRenderOptions {
  page: StaticWebPage;
  config: StaticWebConfig;
  inlineAssets: boolean;
  singlePage: boolean;
}

function pageSearchText(page: StaticWebPage): string {
  const blockValues = (page.blocks ?? []).map((block) => JSON.stringify(block.properties)).join(' ');
  const markdownText = page.markdown.replace(/<[^>]*>/g, ' ');
  return `${page.title} ${page.description} ${page.category} ${page.tags.join(' ')} ${markdownText} ${blockValues}`
    .toLocaleLowerCase();
}

interface MarkdownRenderResult {
  html: string;
  headings: Array<{ id: string; title: string; level: number }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value: string): boolean {
  if (/[\u0000-\u001f]/.test(value) || value.startsWith('//') || value.startsWith('\\\\')) return false;
  const scheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme);
}

function cleanAssetPath(value: string): string {
  return value
    .split(/[?#]/)[0]
    .replace(/\\/g, '/')
    .replace(/^(\.\/|\/)+/, '')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

function findAssetPath(source: string, page: StaticWebPage, config: StaticWebConfig): string | undefined {
  const resolved = resolveStaticWebReferencePath(source, page.sourcePath);
  const direct = cleanAssetPath(source);
  const asset = config.assets.find(
    (candidate) =>
      (resolved !== undefined && resolved !== '' &&
        (candidate.path === resolved || candidate.path.endsWith(`/${resolved}`))) ||
      candidate.path === direct ||
      candidate.path.endsWith(`/${direct}`),
  );
  return asset?.path;
}

function resolveMarkdownLink(url: string, options: MarkdownRenderOptions): string {
  const { page, config } = options;
  if (!safeUrl(url)) return '';
  if (url.startsWith('#')) {
    if (!options.singlePage || url === '#top' || url === '#content') return url;
    return `#${page.slug}-${url.slice(1)}`;
  }
  const markdownTarget = url.match(/^(?:\.\/)?([^?#]+)\.(md|html)([?#].*)?$/i);
  if (!markdownTarget) return url;

  const targetPath = resolveStaticWebReferencePath(
    `${markdownTarget[1]}.${markdownTarget[2]}`,
    page.sourcePath,
  );
  if (!targetPath) return url;
  const markdownSourcePath = targetPath.replace(/\.html$/i, '.md');
  const pageSlug = markdownSourcePath.replace(/\.md$/i, '').split('/').pop() ?? '';
  const targetPage = config.pages.find(
    (candidate) =>
      candidate.slug === pageSlug ||
      candidate.sourcePath === markdownSourcePath ||
      candidate.sourcePath === targetPath,
  );
  if (!targetPage) return url;
  const suffix = markdownTarget[3] ?? '';
  if (options.singlePage) {
    const fragment = suffix.match(/#([^?]+)/)?.[1];
    return `#${targetPage.slug}${fragment ? `-${fragment}` : ''}`;
  }
  return `${targetPage.slug}.html${suffix}`;
}

function syntaxHighlight(code: string): string {
  const tokenPattern =
    /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|class|export|import|from|async|await|true|false|null|None|def|print|fn|pub|use|struct|impl|package|func|type|var|interface|SELECT|FROM|WHERE)\b|\b\d+(?:\.\d+)?\b)/g;
  let output = '';
  let offset = 0;
  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0];
    const start = match.index ?? 0;
    output += escapeHtml(code.slice(offset, start));
    const kind =
      token.startsWith('//') || token.startsWith('#') || token.startsWith('/*')
        ? 'comment'
        : /^[`"']/.test(token)
          ? 'string'
          : /^\d/.test(token)
            ? 'number'
            : 'keyword';
    output += `<span class="tok-${kind}">${escapeHtml(token)}</span>`;
    offset = start + token.length;
  }
  output += escapeHtml(code.slice(offset));
  return output;
}

function mermaidFlowchart(source: string): string | undefined {
  const nodes = new Map<string, string>();
  const edges: Array<{ from: string; to: string; label: string }> = [];
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (/^(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\s*$/i.test(line) || line.startsWith('%%')) continue;
    if (/^(?:subgraph|end)\b/i.test(line)) return undefined;
    const segments = line.split(/\s*(?:-->|---|==>)\s*/);
    if (segments.length < 2) return undefined;
    let previous: string | undefined;
    for (const [index, rawSegment] of segments.entries()) {
      const labelMatch = rawSegment.match(/^\|([^|]*)\|\s*(.*)$/);
      const segment = labelMatch?.[2] ?? rawSegment;
      const nodeMatch = segment.match(/^\s*([A-Za-z][\w-]*)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?/);
      if (!nodeMatch) return undefined;
      const id = nodeMatch[1];
      const label = nodeMatch[2] ?? nodeMatch[3] ?? nodeMatch[4] ?? id;
      nodes.set(id, label);
      if (previous) edges.push({ from: previous, to: id, label: labelMatch?.[1] ?? '' });
      previous = id;
      if (index === segments.length - 1) {
        const trailing = segment.slice(nodeMatch[0].length).trim();
        if (trailing) return undefined;
      }
    }
  }

  if (nodes.size === 0) return undefined;
  const ids = [...nodes.keys()];
  const positions = new Map(ids.map((id, index) => [id, { x: 45 + (index % 3) * 220, y: 45 + Math.floor(index / 3) * 120 }]));
  const width = Math.max(280, Math.min(ids.length, 3) * 220 + 50);
  const height = Math.max(120, Math.ceil(ids.length / 3) * 120);
  const edgeMarkup = edges
    .map(({ from, to, label }) => {
      const start = positions.get(from)!;
      const end = positions.get(to)!;
      return `<g class="diagram-edge"><line x1="${start.x + 82}" y1="${start.y + 24}" x2="${end.x + 82}" y2="${end.y + 24}" marker-end="url(#arrow)"/><text x="${(start.x + end.x) / 2 + 82}" y="${(start.y + end.y) / 2 + 18}">${escapeHtml(label)}</text></g>`;
    })
    .join('');
  const nodeMarkup = ids
    .map((id) => {
      const point = positions.get(id)!;
      const label = escapeHtml(nodes.get(id) ?? id);
      return `<g class="diagram-node"><rect x="${point.x}" y="${point.y}" width="164" height="48" rx="10"/><text x="${point.x + 82}" y="${point.y + 29}">${label}</text></g>`;
    })
    .join('');
  return `<svg class="mermaid-diagram" role="img" aria-label="Mermaid flowchart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>${edgeMarkup}${nodeMarkup}</svg>`;
}

function mermaidSequence(source: string): string | undefined {
  const participants = new Map<string, string>();
  const messages: Array<{ from: string; to: string; text: string; dashed: boolean }> = [];
  for (const rawLine of source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    if (/^sequenceDiagram$/i.test(rawLine) || rawLine.startsWith('%%')) continue;
    const participant = rawLine.match(/^participant\s+([\w-]+)(?:\s+as\s+(.+))?$/i);
    if (participant) {
      participants.set(participant[1], participant[2] ?? participant[1]);
      continue;
    }
    const message = rawLine.match(/^([\w-]+)\s*(-+>>|-+>|-+x|\.->>|\.->)\s*([\w-]+)\s*:\s*(.+)$/);
    if (!message) return undefined;
    const [, from, arrow, to, text] = message;
    if (!participants.has(from)) participants.set(from, from);
    if (!participants.has(to)) participants.set(to, to);
    messages.push({ from, to, text, dashed: arrow.startsWith('.') });
  }
  if (!participants.size || !messages.length) return undefined;
  const ids = [...participants.keys()];
  const positions = new Map(ids.map((id, index) => [id, 60 + index * 190]));
  const width = Math.max(260, 120 + ids.length * 190);
  const height = 100 + messages.length * 58;
  const lifelines = ids
    .map((id) => {
      const x = positions.get(id)!;
      return `<g class="sequence-participant"><rect x="${x - 64}" y="14" width="128" height="38" rx="8"/><text x="${x}" y="38">${escapeHtml(participants.get(id) ?? id)}</text><line class="sequence-lifeline" x1="${x}" y1="52" x2="${x}" y2="${height - 16}"/></g>`;
    })
    .join('');
  const arrows = messages
    .map(({ from, to, text, dashed }, index) => {
      const start = positions.get(from)!;
      const end = positions.get(to)!;
      const y = 82 + index * 58;
      return `<g class="sequence-message"><line x1="${start}" y1="${y}" x2="${end}" y2="${y}"${dashed ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#arrow)"/><text x="${(start + end) / 2}" y="${y - 7}">${escapeHtml(text)}</text></g>`;
    })
    .join('');
  return `<svg class="mermaid-diagram" role="img" aria-label="Mermaid sequence diagram" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>${lifelines}${arrows}</svg>`;
}

function renderMermaid(source: string): string | undefined {
  if (/^\s*sequenceDiagram\b/im.test(source)) return mermaidSequence(source);
  if (/^\s*(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/im.test(source)) return mermaidFlowchart(source);
  return undefined;
}

function renderInline(text: string, options: MarkdownRenderOptions): string {
  const tokens = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_)/g;
  let html = '';
  let offset = 0;
  for (const match of text.matchAll(tokens)) {
    const token = match[0];
    const start = match.index ?? 0;
    html += escapeHtml(text.slice(offset, start));
    const link = token.match(/^(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)$/);
    if (link) {
      const [, imageMarker, label, rawUrl, title] = link;
      if (imageMarker) {
        const assetPath = findAssetPath(rawUrl, options.page, options.config);
        const asset = options.config.assets.find((candidate) => candidate.path === assetPath);
        const source = asset
          ? options.inlineAssets
            ? `data:${asset.mediaType};base64,${asset.content}`
            : `assets/${asset.path}`
          : /^https?:\/\//i.test(rawUrl) && safeUrl(rawUrl)
            ? rawUrl
            : '';
        html += source
          ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(label)}" loading="lazy"/>`
          : escapeHtml(label);
      } else {
        const url = resolveMarkdownLink(rawUrl, options);
        html += url
          ? `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${escapeHtml(label)}</a>`
          : escapeHtml(label);
      }
    } else if (token.startsWith('`')) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
    } else if (token.startsWith('**') || token.startsWith('__')) {
      html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`;
    } else if (token.startsWith('~~')) {
      html += `<del>${escapeHtml(token.slice(2, -2))}</del>`;
    } else {
      html += `<em>${escapeHtml(token.slice(1, -1))}</em>`;
    }
    offset = start + token.length;
  }
  return html + escapeHtml(text.slice(offset));
}

function headingId(value: string, used: Set<string>): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function renderMarkdown(markdown: string, options: MarkdownRenderOptions): MarkdownRenderResult {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  const headings: MarkdownRenderResult['headings'] = [];
  const usedHeadingIds = new Set<string>();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    const fence = line.match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index++;
      const code = codeLines.join('\n');
      if (fence[1].toLowerCase() === 'mermaid') {
        const diagram = renderMermaid(code);
        output.push(diagram ?? `<pre class="mermaid-source"><code>${escapeHtml(code)}</code></pre>`);
      } else {
        output.push(`<pre><code class="language-${escapeHtml(fence[1] || 'text')}">${syntaxHighlight(code)}</code></pre>`);
      }
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const headingSlug = headingId(title, usedHeadingIds);
      const id = options.singlePage ? `${options.page.slug}-${headingSlug}` : headingSlug;
      headings.push({ id, title, level });
      output.push(`<h${level} id="${id}">${renderInline(title, options)}</h${level}>`);
      index++;
      continue;
    }

    if (index + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const tableRows = [line];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) tableRows.push(lines[index++]);
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      const header = cells(tableRows[0]);
      const body = tableRows.slice(1).map(cells);
      output.push(`<div class="table-wrap"><table><thead><tr>${header.map((cell) => `<th>${renderInline(cell, options)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${header.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] ?? '', options)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push('<hr/>');
      index++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      }
      output.push(`<blockquote>${renderMarkdown(quote.join('\n'), options).html}</blockquote>`);
      continue;
    }

    const listMatch = line.match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[2]);
      const tag = ordered ? 'ol' : 'ul';
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(`<li>${renderInline(item[3], options)}</li>`);
        index++;
      }
      output.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,6}\s|```|>\s?)/.test(lines[index])) {
      paragraph.push(lines[index++]);
    }
    output.push(`<p>${paragraph.map((part) => renderInline(part, options)).join('<br/>')}</p>`);
  }

  return { html: output.join('\n'), headings };
}

function value(block: StaticWebBlock, key: string, fallback = ''): string {
  const candidate = block.properties[key];
  return typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean'
    ? String(candidate)
    : fallback;
}

function listValue(block: StaticWebBlock, key: string): string[] {
  const candidate = block.properties[key];
  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === 'string')
    : typeof candidate === 'string'
      ? candidate.split('\n').map((entry) => entry.trim()).filter(Boolean)
      : [];
}

function propertyInputType(type: StaticWebBrickPropertyType): string {
  return type;
}

function renderBlock(block: StaticWebBlock, options: MarkdownRenderOptions): string {
  const definition = getStaticWebBrick(block.brickId);
  if (!definition) return '';
  const title = escapeHtml(value(block, 'title'));
  switch (block.brickId) {
    case 'hero': {
      const actionLabel = value(block, 'actionLabel');
      const actionUrl = value(block, 'actionUrl');
      const resolvedUrl = resolveMarkdownLink(actionUrl, options);
      return `<header class="hero" id="${escapeHtml(options.page.slug)}-top"><p class="eyebrow">${escapeHtml(options.page.category || 'Static Web')}</p><h1>${title || escapeHtml(options.page.title)}</h1><p>${escapeHtml(value(block, 'subtitle'))}</p>${resolvedUrl && actionLabel ? `<a class="button" href="${escapeHtml(resolvedUrl)}">${escapeHtml(actionLabel)}</a>` : ''}</header>`;
    }
    case 'text-content':
      return `<section class="content-block"><h2>${escapeHtml(value(block, 'heading', 'Content'))}</h2>${renderMarkdown(value(block, 'markdown'), options).html}</section>`;
    case 'features':
      return `<section class="content-block"><h2>${escapeHtml(value(block, 'heading', 'Features'))}</h2><div class="card-grid">${listValue(block, 'items').map((item) => `<article class="card"><h3>${escapeHtml(item)}</h3></article>`).join('')}</div></section>`;
    case 'gallery':
      return `<section class="content-block"><h2>${escapeHtml(value(block, 'heading', 'Gallery'))}</h2><div class="gallery">${listValue(block, 'images').map((image) => {
        const assetPath = findAssetPath(image, options.page, options.config);
        const asset = options.config.assets.find((candidate) => candidate.path === assetPath);
        if (!asset) return '';
        const src = options.inlineAssets ? `data:${asset.mediaType};base64,${asset.content}` : `assets/${asset.path}`;
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(image.split('/').pop() ?? 'Gallery image')}" loading="lazy"/>`;
      }).join('')}</div></section>`;
    case 'testimonials':
      return `<section class="testimonial"><blockquote>“${escapeHtml(value(block, 'quote'))}”</blockquote><p><strong>${escapeHtml(value(block, 'author'))}</strong>${value(block, 'role') ? ` · ${escapeHtml(value(block, 'role'))}` : ''}</p></section>`;
    case 'call-to-action': {
      const actionUrl = value(block, 'actionUrl');
      const actionLabel = value(block, 'actionLabel');
      const resolvedUrl = resolveMarkdownLink(actionUrl, options);
      return `<section class="cta"><h2>${escapeHtml(value(block, 'title'))}</h2><p>${escapeHtml(value(block, 'text'))}</p>${resolvedUrl && actionLabel ? `<a class="button" href="${escapeHtml(resolvedUrl)}">${escapeHtml(actionLabel)}</a>` : ''}</section>`;
    }
    default:
      return `<section class="content-block" data-brick="${escapeHtml(definition.id)}"></section>`;
  }
}

function renderPageContent(
  page: StaticWebPage,
  config: StaticWebConfig,
  inlineAssets: boolean,
  singlePage = false,
): { html: string; toc: MarkdownRenderResult['headings'] } {
  const options = { page, config, inlineAssets, singlePage };
  if (config.compositionMode === 'layout-driven' && page.blocks.length > 0) {
    const blocks = page.blocks.map((block) => renderBlock(block, options)).join('\n');
    const markdown = page.markdown ? renderMarkdown(page.markdown, options) : { html: '', headings: [] };
    return { html: `${blocks}\n${markdown.html}`, toc: markdown.headings };
  }
  const rendered = renderMarkdown(page.markdown, options);
  return { html: rendered.html, toc: rendered.headings };
}

function pageHref(page: StaticWebPage, config: StaticWebConfig, singlePage: boolean): string {
  if (singlePage || config.organization === 'single-page') return `#${page.slug}`;
  return `${page.slug}.html`;
}

function categoryTree(
  pages: StaticWebPage[],
  config: StaticWebConfig,
  singlePage: boolean,
): string {
  const root = new Map<string, { pages: StaticWebPage[]; children: Map<string, unknown> }>();
  for (const page of pages) {
    const segments = page.category.split(/[/>]/).map((part) => part.trim()).filter(Boolean);
    let current = root;
    for (const segment of segments) {
      let node = current.get(segment) as { pages: StaticWebPage[]; children: Map<string, unknown> } | undefined;
      if (!node) {
        node = { pages: [], children: new Map() };
        current.set(segment, node);
      }
      current = node.children as Map<string, { pages: StaticWebPage[]; children: Map<string, unknown> }>;
    }
    if (segments.length) {
      const node = rootOfPath(root, segments);
      node?.pages.push(page);
    }
  }
  const render = (items: Map<string, unknown>, level: number): string =>
    [...items.entries()]
      .map(([name, value]) => {
        const node = value as { pages: StaticWebPage[]; children: Map<string, unknown> };
        return `<li class="nav-category level-${Math.min(level, 4)}"><span>${escapeHtml(name)}</span>${node.pages.length ? `<ul>${node.pages.map((page) => `<li><a data-page-slug="${escapeHtml(page.slug)}" href="${escapeHtml(pageHref(page, config, singlePage))}">${escapeHtml(page.title)}</a></li>`).join('')}</ul>` : ''}${node.children.size ? `<ul>${render(node.children, level + 1)}</ul>` : ''}</li>`;
      })
      .join('');
  const categorized = pages.some((page) => page.category);
  return categorized ? `<ul class="category-tree">${render(root, 1)}</ul>` : '';
}

function rootOfPath(
  root: Map<string, unknown>,
  path: string[],
): { pages: StaticWebPage[]; children: Map<string, unknown> } | undefined {
  let current = root;
  let node: { pages: StaticWebPage[]; children: Map<string, unknown> } | undefined;
  for (const segment of path) {
    node = current.get(segment) as typeof node;
    if (!node) return undefined;
    current = node.children;
  }
  return node;
}

function renderNavigation(
  pages: StaticWebPage[],
  activePage: StaticWebPage | undefined,
  config: StaticWebConfig,
  singlePage: boolean,
  siteName: string,
): string {
  const links = pages.map((page) => `<li><a data-page-slug="${escapeHtml(page.slug)}"${activePage?.slug === page.slug ? ' aria-current="page"' : ''} href="${escapeHtml(pageHref(page, config, singlePage))}">${escapeHtml(page.title)}</a></li>`).join('');
  const hierarchy = config.organization === 'documentation' ? categoryTree(pages, config, singlePage) : '';
  const contents = `<ul class="page-nav">${links}</ul>${hierarchy}`;
  const topbar = config.navigation !== 'sidebar';
  const sidebar = config.navigation === 'sidebar' || config.navigation === 'combined';
  const navToggle = `<button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-navigation" aria-label="Ouvrir le menu de navigation"><span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span><span>Menu</span></button>`;
  const sidebarToggle = `<button class="nav-toggle sidebar-toggle" type="button" data-sidebar-toggle aria-expanded="true" aria-controls="sidebar-navigation" aria-label="Fermer le menu latéral"><span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="sidebar-toggle-label">Menu</span></button>`;
  const topbarNavigation = topbar
    ? `<nav class="topbar navigation-${config.navigation}" aria-label="Navigation principale"><a class="brand" href="${escapeHtml(singlePage ? '#top' : 'index.html')}">${escapeHtml(siteName)}</a>${navToggle}<div id="site-navigation" class="nav-panel" data-nav-panel>${contents}</div></nav>`
    : '';
  const sidebarNavigation = sidebar
    ? `<aside class="sidebar"><div class="sidebar-header"><a class="brand" href="${escapeHtml(singlePage ? '#top' : 'index.html')}">${escapeHtml(siteName)}</a>${sidebarToggle}</div><nav id="sidebar-navigation" class="sidebar-navigation" data-sidebar-navigation aria-label="Navigation des pages">${contents}</nav></aside>`
    : '';
  return `${topbarNavigation}${sidebarNavigation}`;
}

const STATIC_WEB_CSS = `
:root{color-scheme:light dark;--primary:#4f46e5;--accent:#14b8a6;--light-background:#f8fafc;--light-text:#172033;--dark-background:#0b1020;--dark-text:#e5e7eb;--background:var(--dark-background);--text:var(--dark-text);--surface:#141b2d;--muted:#a1a1aa;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--background);color:var(--text);line-height:1.65}a{color:var(--primary);text-underline-offset:.2em}a:hover{color:var(--accent)}button,input{font:inherit}.topbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:2rem;padding:.75rem 1.5rem;background:var(--surface);border-bottom:1px solid color-mix(in srgb,var(--text) 15%,transparent)}.topbar .page-nav{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem}.brand{font-weight:750;color:var(--text);text-decoration:none}.page-nav,.category-tree{list-style:none;padding:0;margin:0}.page-nav a,.category-tree a{display:block;padding:.35rem .5rem;border-radius:.4rem;color:inherit;text-decoration:none}.page-nav a[aria-current=page]{background:color-mix(in srgb,var(--primary) 25%,transparent)}.category-tree{margin-top:1rem}.category-tree .nav-category>span{display:block;padding:.5rem;color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em}.category-tree ul{list-style:none;padding-left:.75rem}.sidebar{position:fixed;inset:0 auto 0 0;width:17rem;overflow:auto;padding:1.5rem;background:var(--surface);border-right:1px solid color-mix(in srgb,var(--text) 15%,transparent)}.site-shell{min-height:100vh}.has-sidebar .site-main{margin-left:17rem}.content{max-width:60rem;margin:auto;padding:2.5rem clamp(1rem,5vw,4rem)}.has-sidebar .content{margin:0 auto}.hero{padding:clamp(3rem,9vw,8rem) clamp(1rem,8vw,7rem);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 22%,var(--background)),var(--background));border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent)}.hero h1{max-width:16ch;margin:.4rem 0;font-size:clamp(2.5rem,7vw,5.25rem);line-height:1.05;letter-spacing:-.04em}.hero>p:not(.eyebrow){max-width:48rem;color:var(--muted);font-size:1.2rem}.eyebrow{color:var(--accent);font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}h1,h2,h3{line-height:1.2}h2{margin-top:2.5rem}p{max-width:78ch}.button{display:inline-block;margin-top:1rem;padding:.7rem 1.1rem;border-radius:.6rem;background:var(--primary);color:white;text-decoration:none;font-weight:700}.content-block,.testimonial,.cta{margin:2rem auto;padding:1.5rem;border-radius:1rem;background:var(--surface)}.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}.card{padding:1rem;border:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:.7rem}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}.gallery img{width:100%;height:13rem;object-fit:cover;border-radius:.7rem}.testimonial blockquote{margin:0;font-size:1.4rem}.toc{padding:1rem;border-left:2px solid var(--primary);background:var(--surface)}.toc ul{margin:.5rem 0;padding-left:1.4rem}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:.55rem .75rem;border:1px solid color-mix(in srgb,var(--text) 18%,transparent);text-align:left}th{background:var(--surface)}pre{overflow:auto;padding:1rem;border-radius:.7rem;background:#111827;color:#e5e7eb}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.tok-keyword{color:#c4b5fd}.tok-string{color:#86efac}.tok-comment{color:#94a3b8}.tok-number{color:#fca5a5}.mermaid-diagram{display:block;width:100%;max-height:32rem;margin:1rem auto}.diagram-node rect,.sequence-participant rect{fill:var(--surface);stroke:var(--primary);stroke-width:2}.diagram-node text,.diagram-edge text,.sequence-participant text,.sequence-message text{fill:var(--text);font-size:12px;text-anchor:middle}.diagram-edge line,.sequence-message line{stroke:var(--accent);stroke-width:2}.sequence-lifeline{stroke:var(--muted);stroke-dasharray:4 4}.diagram-edge marker path,.sequence-message marker path{fill:var(--accent)}.search-box{display:block;width:min(100%,24rem);margin:1rem 0;padding:.65rem .8rem;border:1px solid color-mix(in srgb,var(--text) 25%,transparent);border-radius:.5rem;background:var(--background);color:var(--text)}.display-toggle{position:fixed;right:1rem;bottom:1rem;z-index:10;padding:.6rem .8rem;border:0;border-radius:2rem;background:var(--primary);color:white;cursor:pointer}.page-section{scroll-margin-top:5rem}.page-section+ .page-section{border-top:1px solid color-mix(in srgb,var(--text) 15%,transparent)}footer{padding:2rem;text-align:center;color:var(--muted)}
[data-theme=light]{--background:var(--light-background);--text:var(--light-text);--surface:color-mix(in srgb,var(--background) 94%,black);--muted:color-mix(in srgb,var(--text) 55%,var(--background))}
[data-theme=dark]{--background:var(--dark-background);--text:var(--dark-text);--surface:color-mix(in srgb,var(--background) 88%,white);--muted:color-mix(in srgb,var(--text) 65%,var(--background))}
@media(max-width:760px){.topbar{align-items:flex-start;flex-direction:column;gap:.5rem}.topbar .page-nav{display:block}.sidebar{position:static;width:auto;border-right:0;border-bottom:1px solid color-mix(in srgb,var(--text) 15%,transparent)}.has-sidebar .site-main{margin-left:0}.content{padding:1.5rem 1rem}.hero{padding:3rem 1.2rem}.hero h1{font-size:2.7rem}}
`;

const STATIC_WEB_TEMPLATE_CSS = `
.template-documentation .sidebar{padding:1.75rem 1rem}.template-documentation .sidebar-header>.brand{display:block;padding:.35rem .2rem;font-size:1.1rem}.template-documentation .sidebar .page-nav a{padding:.55rem .7rem}.template-documentation .site-main{min-height:100vh}.template-documentation .content{max-width:54rem}.template-documentation .page-heading{margin:1rem auto 2.5rem;padding:0 0 1.5rem;border-bottom:1px solid color-mix(in srgb,var(--text) 13%,transparent)}.template-documentation .page-heading h1{margin:.25rem 0;font-size:clamp(2rem,4vw,3rem);letter-spacing:-.035em}.template-documentation .toc{margin:1.5rem 0;border-radius:.2rem .75rem .75rem .2rem}
.template-website .topbar{min-height:4.5rem;padding:.75rem clamp(1rem,4vw,3.5rem);backdrop-filter:blur(16px)}.template-website .topbar .page-nav{margin-left:auto}.template-website .brand{font-size:1.1rem;letter-spacing:-.02em}.template-website .page-nav a{padding:.55rem .85rem}.template-website .site-main{margin-inline:auto}.template-website.has-sidebar .site-main{margin-left:17rem}.template-website .page-heading{padding:clamp(3rem,8vw,6.5rem) clamp(1rem,8vw,7rem);background:radial-gradient(ellipse at 85% 15%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 42%),linear-gradient(135deg,color-mix(in srgb,var(--primary) 16%,var(--background)),var(--background));border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent)}.template-website .page-heading h1{max-width:18ch;margin:.4rem 0;font-size:clamp(2.5rem,6vw,4.75rem);letter-spacing:-.045em}.template-website .content{max-width:76rem;padding:2.5rem clamp(1rem,5vw,4rem)}.template-website .hero{border:1px solid color-mix(in srgb,var(--primary) 22%,transparent);border-radius:0 0 2rem 2rem}.template-website .content-block,.template-website .testimonial,.template-website .cta{padding:clamp(1.25rem,3vw,2.25rem);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);box-shadow:0 1rem 3rem color-mix(in srgb,var(--text) 6%,transparent)}.template-website footer{margin-top:3rem;border-top:1px solid color-mix(in srgb,var(--text) 12%,transparent)}
.template-landing-page .topbar{width:min(calc(100% - 2rem),84rem);margin:1rem auto 0;padding:.65rem 1.25rem;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:999px;box-shadow:0 .5rem 2rem color-mix(in srgb,var(--text) 7%,transparent);backdrop-filter:blur(16px)}.template-landing-page .topbar .page-nav{margin-left:auto}.template-landing-page .brand{padding:.4rem .8rem}.template-landing-page .site-main{margin:0 auto}.template-landing-page #content{padding:clamp(1rem,4vw,3rem)}.template-landing-page .search-box{margin:0 auto 1.5rem}.template-landing-page .page-section{max-width:88rem;margin:2.5rem auto;padding:clamp(1rem,4vw,3.5rem);border:0}.template-landing-page .page-section+.page-section{border:0}.template-landing-page .page-section:first-of-type .hero{display:flex;min-height:min(72vh,50rem);flex-direction:column;justify-content:center;overflow:hidden;padding:clamp(2.5rem,9vw,8rem);border:1px solid color-mix(in srgb,var(--primary) 24%,transparent);border-radius:2rem;background:radial-gradient(ellipse at 78% 12%,color-mix(in srgb,var(--accent) 23%,transparent),transparent 42%),linear-gradient(135deg,color-mix(in srgb,var(--primary) 20%,var(--background)),var(--background));box-shadow:0 2rem 5rem color-mix(in srgb,var(--primary) 10%,transparent)}.template-landing-page .hero h1{max-width:15ch;font-size:clamp(3rem,8vw,6.5rem)}.template-landing-page .hero>p:not(.eyebrow){font-size:clamp(1.1rem,2vw,1.35rem)}.template-landing-page .page-section .content{max-width:78rem;padding:1.5rem clamp(0rem,3vw,2rem)}.template-landing-page .content-block,.template-landing-page .cta,.template-landing-page .testimonial{margin:2rem 0;padding:clamp(1.5rem,4vw,3rem);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:1.5rem;background:var(--surface);box-shadow:0 1.5rem 4rem color-mix(in srgb,var(--text) 7%,transparent)}.template-landing-page .card-grid{gap:1.25rem}.template-landing-page .card{min-height:10rem;padding:1.5rem;border-color:color-mix(in srgb,var(--primary) 15%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--background) 78%,var(--surface))}.template-landing-page .testimonial blockquote{font-size:clamp(1.4rem,3vw,2.2rem);line-height:1.35}.template-landing-page footer{padding:3rem 1rem 5rem}
@media(max-width:760px){.template-website.has-sidebar .site-main{margin-left:0}.template-landing-page .topbar{width:calc(100% - 1rem);margin:.5rem auto 0;border-radius:1.25rem}.template-landing-page .page-section{margin:1rem auto;padding:.5rem}.template-landing-page .page-section:first-of-type .hero{min-height:60vh;padding:2.5rem 1.25rem;border-radius:1.25rem}.template-landing-page #content{padding:.5rem}.template-landing-page .page-section .content{padding:1rem .5rem}}
`;

const STATIC_WEB_NAVIGATION_CSS = `
.site-shell .topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.25rem;min-height:4.5rem;padding:.75rem clamp(1rem,4vw,3rem);border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent);background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(18px)}
.site-shell .topbar>.brand{flex:0 1 auto;max-width:32ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1.05rem}
.site-shell .nav-panel{flex:1 1 30rem;min-width:0}
.site-shell .page-nav{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.35rem;width:100%;min-width:0}
.site-shell .page-nav li{flex:0 0 auto;max-width:100%}
.site-shell .page-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:2.5rem;max-width:100%;padding:.5rem .85rem;border:1px solid transparent;border-radius:.8rem;color:var(--text);text-decoration:none;white-space:normal;overflow-wrap:anywhere;transition:background .18s ease,border-color .18s ease,color .18s ease}
.site-shell .page-nav a:hover{border-color:color-mix(in srgb,var(--primary) 22%,transparent);background:color-mix(in srgb,var(--primary) 9%,var(--surface));color:var(--text)}
.site-shell .page-nav a:focus-visible,.site-shell .nav-toggle:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.site-shell .page-nav a[aria-current=page]{border-color:color-mix(in srgb,var(--primary) 30%,transparent);background:color-mix(in srgb,var(--primary) 15%,var(--surface));color:var(--text);font-weight:700}
.site-shell .nav-toggle{display:none;align-items:center;justify-content:center;gap:.6rem;min-height:2.75rem;margin-left:auto;padding:.55rem .9rem;border:1px solid color-mix(in srgb,var(--text) 16%,transparent);border-radius:.85rem;background:var(--surface);color:var(--text);font-weight:650;cursor:pointer;box-shadow:0 .3rem 1rem color-mix(in srgb,var(--text) 8%,transparent);transition:border-color .18s ease,background .18s ease}
.site-shell .nav-toggle:hover{border-color:color-mix(in srgb,var(--primary) 45%,transparent);background:color-mix(in srgb,var(--primary) 8%,var(--surface))}
.nav-toggle-icon{display:grid;width:1rem;gap:3px}
.nav-toggle-icon span{display:block;height:2px;border-radius:2px;background:currentColor;transition:transform .18s ease,opacity .18s ease}
.nav-toggle[aria-expanded=true] .nav-toggle-icon span:first-child{transform:translateY(5px) rotate(45deg)}
.nav-toggle[aria-expanded=true] .nav-toggle-icon span:nth-child(2){opacity:0}
.nav-toggle[aria-expanded=true] .nav-toggle-icon span:last-child{transform:translateY(-5px) rotate(-45deg)}
.site-shell .sidebar{z-index:10;overflow:hidden;padding:.75rem .65rem;background:color-mix(in srgb,var(--surface) 97%,transparent);box-shadow:inset -1px 0 color-mix(in srgb,var(--text) 9%,transparent)}
.site-shell .sidebar-header{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;margin:0 .25rem 1rem}
.site-shell .sidebar-header>.brand{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1.05rem;letter-spacing:-.02em}
.site-shell .sidebar .nav-toggle{display:inline-flex;flex:0 0 auto;margin-left:auto}
.site-shell .sidebar-navigation{max-height:calc(100vh - 5rem);overflow:auto}
.site-shell .sidebar .page-nav{flex-direction:column;align-items:stretch;justify-content:flex-start;gap:.2rem}
.site-shell .sidebar .page-nav li,.site-shell .sidebar .page-nav a{width:100%}
.site-shell .sidebar .page-nav a{justify-content:flex-start;min-height:2.65rem;padding:.55rem .75rem;border-radius:.65rem}
.site-shell .sidebar .category-tree{margin-top:1rem;padding-top:.75rem;border-top:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
.site-shell .sidebar .nav-category>span{padding:.65rem .5rem .35rem;font-weight:700}
.site-shell.sidebar-closed .sidebar{width:4.25rem;padding:.75rem .4rem}
.site-shell.sidebar-closed.has-sidebar .site-main{margin-left:4.25rem}
.site-shell.sidebar-closed .sidebar-header{justify-content:center}
.site-shell.sidebar-closed .sidebar-header>.brand,.site-shell.sidebar-closed .sidebar-navigation,.site-shell.sidebar-closed .sidebar-toggle-label{display:none}
.site-shell.sidebar-closed .sidebar .sidebar-toggle{width:100%;margin:0;padding:.55rem .35rem}
.site-shell .topbar.navigation-burger>.nav-toggle{display:inline-flex}
.site-shell .topbar.navigation-burger>.nav-panel{position:absolute;top:calc(100% + .6rem);right:1rem;display:none;width:min(28rem,calc(100vw - 2rem));max-height:min(70vh,34rem);overflow:auto;padding:.75rem;border:1px solid color-mix(in srgb,var(--text) 13%,transparent);border-radius:1rem;background:var(--surface);box-shadow:0 1.5rem 4rem color-mix(in srgb,#000 22%,transparent)}
.site-shell .topbar.navigation-burger>.nav-panel.is-open{display:block}
.site-shell .topbar.navigation-burger .page-nav{flex-direction:column;align-items:stretch;gap:.25rem}
.site-shell .topbar.navigation-burger .page-nav li,.site-shell .topbar.navigation-burger .page-nav a{width:100%}
.site-shell .topbar.navigation-burger .page-nav a{justify-content:flex-start}
.navigation-combined+.sidebar{top:4.5rem}
@media(max-width:900px){
  .site-shell .topbar:not(.navigation-burger)>.nav-toggle{display:inline-flex}
  .site-shell .topbar:not(.navigation-burger)>.nav-panel{position:absolute;top:calc(100% + .6rem);left:1rem;right:1rem;display:none;max-height:min(70vh,34rem);overflow:auto;padding:.75rem;border:1px solid color-mix(in srgb,var(--text) 13%,transparent);border-radius:1rem;background:var(--surface);box-shadow:0 1.5rem 4rem color-mix(in srgb,#000 22%,transparent)}
  .site-shell .topbar:not(.navigation-burger)>.nav-panel.is-open{display:block}
  .site-shell .topbar:not(.navigation-burger) .page-nav{flex-direction:column;align-items:stretch;justify-content:flex-start;gap:.25rem}
  .site-shell .topbar:not(.navigation-burger) .page-nav li,.site-shell .topbar:not(.navigation-burger) .page-nav a{width:100%}
  .site-shell .topbar:not(.navigation-burger) .page-nav a{justify-content:flex-start}
  .site-shell.has-sidebar .sidebar{position:relative;inset:auto;width:auto;height:auto;max-height:none;overflow:visible;padding:.75rem 1rem;border-right:0;border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent);box-shadow:none}
  .site-shell.has-sidebar .sidebar-header{margin:0;padding:0 .25rem}
  .site-shell.has-sidebar .sidebar-navigation{position:absolute;top:calc(100% + .6rem);left:1rem;right:1rem;z-index:21;max-height:min(70vh,34rem);padding:.75rem;border:1px solid color-mix(in srgb,var(--text) 13%,transparent);border-radius:1rem;background:var(--surface);box-shadow:0 1.5rem 4rem color-mix(in srgb,#000 22%,transparent)}
  .site-shell.sidebar-closed .sidebar{width:auto;padding:.75rem 1rem}
  .site-shell.sidebar-closed .sidebar-header{justify-content:flex-end}
  .site-shell.sidebar-closed .sidebar .sidebar-toggle{width:auto;margin-left:auto}
  .site-shell.has-sidebar .site-main{margin-left:0}
  .navigation-combined+.sidebar{display:none}
}
`;

const STATIC_WEB_JS = `
(() => {
  const root = document.documentElement;
  const initial = root.dataset.mode || 'system';
  let dark = initial === 'dark' || (initial === 'toggle' && matchMedia('(prefers-color-scheme: dark)').matches);
  const applyTheme = () => {
    if (initial === 'system') {
      root.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      root.dataset.theme = dark ? 'dark' : 'light';
    }
  };
  applyTheme();
  if (initial === 'system') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  const themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      dark = !dark;
      root.dataset.theme = dark ? 'dark' : 'light';
    });
  }

  const menuToggle = document.querySelector('[data-nav-toggle]');
  const menuPanel = document.querySelector('[data-nav-panel]');
  if (menuToggle && menuPanel) {
    const setMenuOpen = (open) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
      menuPanel.classList.toggle('is-open', open);
    };
    menuToggle.addEventListener('click', () => {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    menuPanel.addEventListener('click', (event) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link) setMenuOpen(false);
    });
    document.addEventListener('click', (event) => {
      if (!menuPanel.contains(event.target) && !menuToggle.contains(event.target)) setMenuOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
      if (event.matches && !menuToggle.closest('.navigation-burger')) setMenuOpen(false);
    });
  }

  const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  const sidebarPanel = sidebarToggle && document.getElementById(sidebarToggle.getAttribute('aria-controls'));
  const sidebarShell = sidebarToggle?.closest('.site-shell');
  if (sidebarToggle && sidebarPanel && sidebarShell) {
    const setSidebarOpen = (open) => {
      sidebarToggle.setAttribute('aria-expanded', String(open));
      sidebarToggle.setAttribute('aria-label', open ? 'Fermer le menu latéral' : 'Ouvrir le menu latéral');
      sidebarShell.classList.toggle('sidebar-closed', !open);
    };
    sidebarToggle.addEventListener('click', () => {
      setSidebarOpen(sidebarToggle.getAttribute('aria-expanded') !== 'true');
    });
    sidebarPanel.addEventListener('click', (event) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link?.getAttribute('href')?.startsWith('#')) setSidebarOpen(false);
    });
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (matchMedia('(max-width: 900px)').matches &&
          sidebarToggle.getAttribute('aria-expanded') === 'true' &&
          target instanceof Node && !sidebarPanel.contains(target) && !sidebarToggle.contains(target)) {
        setSidebarOpen(false);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebarToggle.getAttribute('aria-expanded') === 'true') {
        setSidebarOpen(false);
        sidebarToggle.focus();
      }
    });
  }

  const search = document.querySelector('[data-site-search]');
  const indexNode = document.querySelector('#search-index');
  const index = indexNode ? JSON.parse(indexNode.textContent || '{}') : {};
  if (search) search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    document.querySelectorAll('[data-searchable]').forEach((item) => {
      const slug = item.dataset.pageSlug;
      item.hidden = Boolean(query) && !(index[slug] || '').includes(query);
    });
    document.querySelectorAll('[data-page-slug]').forEach((item) => {
      const slug = item.dataset.pageSlug;
      item.hidden = Boolean(query) && !(index[slug] || '').includes(query);
    });
    const empty = document.querySelector('[data-search-empty]');
    if (empty) empty.hidden = !query || Boolean(document.querySelector('[data-page-slug]:not([hidden])'));
  });
})();
`;

const PREVIEW_NAVIGATION_JS = `
document.addEventListener('click',(event)=>{const link=event.target instanceof Element?event.target.closest('a[href^="#"]'):null;if(!link)return;const id=link.getAttribute('href')?.slice(1);if(!id)return;const target=document.getElementById(id);if(!target)return;event.preventDefault();const slug=link.getAttribute('data-page-slug');if(slug)document.querySelectorAll('a[data-page-slug]').forEach((item)=>{if(item.getAttribute('data-page-slug')===slug)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});const panel=link.closest('[data-nav-panel]');if(panel){panel.classList.remove('is-open');const toggle=document.querySelector('[data-nav-toggle]');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Ouvrir le menu de navigation')}const sidebarPanel=link.closest('[data-sidebar-navigation]');if(sidebarPanel){const shell=link.closest('.site-shell');shell?.classList.add('sidebar-closed');const toggle=shell?.querySelector('[data-sidebar-toggle]');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Ouvrir le menu latéral')}target.scrollIntoView({behavior:'smooth',block:'start'});});
`;

function themeVariables(config: StaticWebConfig): string {
  const color = (value: string, fallback: string) => /^#[\da-f]{6}$/i.test(value) ? value : fallback;
  return `--primary:${color(config.theme.primary, '#4f46e5')};--accent:${color(config.theme.accent, '#14b8a6')};--light-background:${color(config.theme.background, '#f8fafc')};--light-text:${color(config.theme.text, '#172033')};--dark-background:${color(config.theme.darkBackground, '#0b1020')};--dark-text:${color(config.theme.darkText, '#e5e7eb')};`;
}

function tocMarkup(headings: MarkdownRenderResult['headings']): string {
  const entries = headings.filter((heading) => heading.level > 1);
  if (!entries.length) return '';
  return `<nav class="toc" aria-label="Table of contents"><strong>On this page</strong><ul>${entries.map((heading) => `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.title)}</a></li>`).join('')}</ul></nav>`;
}

function renderDocument(
  config: StaticWebConfig,
  pages: StaticWebPage[],
  activePage: StaticWebPage | undefined,
  options: {
    singlePage: boolean;
    inlineAssets: boolean;
    preview?: boolean;
    pageContents?: Map<string, string>;
    template: ApplicationTemplate;
    siteName: string;
  },
): string {
  const sidebar = config.navigation === 'sidebar' || config.navigation === 'combined';
  const topbar = config.navigation !== 'sidebar';
  const navigation = renderNavigation(pages, activePage, config, options.singlePage, options.siteName);
  const displayMode = ['light', 'dark', 'system', 'toggle'].includes(config.displayMode)
    ? config.displayMode
    : 'system';
  let content: string;
  if (options.singlePage) {
    content = pages.map((page) => {
      const rendered = renderPageContent(page, config, options.inlineAssets, options.singlePage);
      const body = options.pageContents?.get(page.slug) ?? rendered.html;
      const toc = options.template === 'static-documentation' ? tocMarkup(rendered.toc) : '';
      const hasHero = config.compositionMode === 'layout-driven' &&
        page.blocks.some((block) => block.brickId === 'hero');
      const hasPageTitle = rendered.toc.some(
        (heading) => heading.level === 1 && heading.title.toLocaleLowerCase() === page.title.toLocaleLowerCase(),
      );
      const pageHeading = hasHero || hasPageTitle
        ? ''
        : `<header class="page-heading"><p class="eyebrow">${escapeHtml(page.category || 'Page')}</p><h1>${escapeHtml(page.title)}</h1>${page.description ? `<p>${escapeHtml(page.description)}</p>` : ''}</header>`;
      return `<section class="page-section" id="${escapeHtml(page.slug)}" data-searchable data-page-slug="${escapeHtml(page.slug)}">${pageHeading}${toc}<article class="content">${body}</article></section>`;
    }).join('');
  } else if (activePage) {
    const rendered = renderPageContent(activePage, config, options.inlineAssets, options.singlePage);
    const body = options.pageContents?.get(activePage.slug) ?? rendered.html;
    const hasHero = config.compositionMode === 'layout-driven' &&
      activePage.blocks.some((block) => block.brickId === 'hero');
    const hasPageTitle = rendered.toc.some(
      (heading) => heading.level === 1 && heading.title.toLocaleLowerCase() === activePage.title.toLocaleLowerCase(),
    );
    const pageHeading = hasHero || hasPageTitle
      ? ''
      : `<header class="page-heading"><h1>${escapeHtml(activePage.title)}</h1>${activePage.description ? `<p>${escapeHtml(activePage.description)}</p>` : ''}</header>`;
    const toc = options.template === 'static-documentation' ? tocMarkup(rendered.toc) : '';
    content = `<article class="content" data-searchable data-page-slug="${escapeHtml(activePage.slug)}">${pageHeading}${toc}${body}</article>`;
  } else {
    content = `<article class="content">${pages.map((page) => `<section><h2><a href="${escapeHtml(pageHref(page, config, false))}">${escapeHtml(page.title)}</a></h2><p>${escapeHtml(page.description)}</p></section>`).join('')}</article>`;
  }
  const searchEnabled = options.template === 'static-documentation' && pages.length > 1;
  const search = searchEnabled ? '<input class="search-box" type="search" data-site-search aria-label="Search pages" placeholder="Search pages…"/><p data-search-empty hidden>No matching pages.</p>' : '';
  const searchIndex = JSON.stringify(Object.fromEntries(pages.map((page) => [page.slug, pageSearchText(page)]))).replace(/</g, '\\u003c');
  const searchIndexMarkup = searchEnabled ? `<script type="application/json" id="search-index">${searchIndex}</script>` : '';
  const style = options.inlineAssets
    ? `<style>${STATIC_WEB_CSS}${STATIC_WEB_TEMPLATE_CSS}${STATIC_WEB_NAVIGATION_CSS}\n:root{${themeVariables(config)}}</style>`
    : '<link rel="stylesheet" href="static-web.css"/>';
  const script = options.inlineAssets
    ? `<script>${STATIC_WEB_JS}${options.preview ? PREVIEW_NAVIGATION_JS : ''}</script>`
    : '<script src="static-web.js" defer></script>';
  const themeToggle = config.displayMode === 'toggle' ? '<button class="display-toggle" type="button" data-theme-toggle aria-label="Toggle color theme">Toggle theme</button>' : '';
  const pageTitle = activePage?.title ?? config.pages[0]?.title ?? 'Static Web';
  const templateClass = options.template === 'static-website'
    ? 'template-website'
    : options.template === 'static-landing-page'
      ? 'template-landing-page'
      : 'template-documentation';
  return `<!doctype html>
<html lang="en" data-mode="${displayMode}" data-theme="${displayMode}" style="${themeVariables(config)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="description" content="${escapeHtml(activePage?.description ?? '')}"/><title>${escapeHtml(pageTitle)}</title>${style}</head>
<body><div class="site-shell ${templateClass}${sidebar ? ' has-sidebar' : ''}">${navigation}<main id="top" class="site-main">${topbar || sidebar ? '' : `<header class="hero"><h1>${escapeHtml(options.siteName)}</h1></header>`}<div id="content">${search}${searchIndexMarkup}${content}</div><footer>Generated with SpecForge</footer></main></div>${themeToggle}${script}</body></html>`;
}

function asGeneratedFile(
  path: string,
  content: string,
  language: GeneratedFile['language'],
  reason: string,
  brickId = 'static-web-renderer',
): GeneratedFile {
  return {
    path,
    content,
    language,
    size: getContentByteLength(content),
    brickId,
    brickName: 'Static Web Renderer',
    brickVersion: '1.0.0',
    reason,
  };
}

function generateAssetFiles(config: StaticWebConfig, outputDirectory = ''): GeneratedFile[] {
  return config.assets.map((asset) => ({
    path: `${outputDirectory ? `${outputDirectory}/` : ''}assets/${asset.path}`,
    content: asset.content,
    encoding: 'base64',
    language: 'binary',
    size: Math.floor((asset.content.length * 3) / 4) -
      (asset.content.endsWith('==') ? 2 : asset.content.endsWith('=') ? 1 : 0),
    brickId: 'static-web-assets',
    brickName: 'Static Web Assets',
    brickVersion: '1.0.0',
    reason: `Imported local asset (${asset.mediaType}).`,
  }));
}

export function renderStaticWebPreview(
  config: StaticWebConfig,
  selectedSlug?: string,
  template: ApplicationTemplate = 'static-documentation',
  siteName: string = config.pages[0]?.title ?? 'Static Web',
): string {
  const pages = sortStaticWebPages(config.pages);
  const pageContents = new Map(pages.map((page) => [page.slug, renderPageContent(page, config, true, true).html]));
  const selected = pages.find((page) => page.slug === selectedSlug);
  return renderDocument(config, pages, selected, {
    singlePage: true,
    inlineAssets: true,
    preview: true,
    pageContents,
    template,
    siteName,
  });
}

export interface StaticWebGenerationOptions {
  config?: StaticWebConfig;
  template?: ApplicationTemplate;
  outputDirectory?: string;
}

export function generateStaticWebSite(
  spec: ProjectSpecification,
  options: StaticWebGenerationOptions = {},
): GeneratedFile[] {
  const config = options.config ?? getProjectUiUxConfig(spec);
  if (!config) return [];
  const template = options.template ?? spec.template;
  const outputDirectory = options.outputDirectory?.replace(/^\/+|\/+$/g, '') ?? '';
  const outputPath = (path: string) => `${outputDirectory ? `${outputDirectory}/` : ''}${path}`;
  const pages = sortStaticWebPages(config.pages);
  const files: GeneratedFile[] = [];

  if (config.exportMode === 'single-html') {
    const renderedPages = new Map(pages.map((page) => [page.slug, renderPageContent(page, config, true, true).html]));
    const html = renderDocument(config, pages, undefined, {
      singlePage: true,
      inlineAssets: true,
      pageContents: renderedPages,
      template,
      siteName: spec.project.name,
    });
    return [asGeneratedFile(outputPath('index.html'), html, 'html', 'Standalone HTML with inlined styles, scripts, content, and imported assets.')];
  }

  files.push(asGeneratedFile(outputPath('static-web.css'), `${STATIC_WEB_CSS}${STATIC_WEB_TEMPLATE_CSS}${STATIC_WEB_NAVIGATION_CSS}`, 'css', 'Local responsive template, theme, and component styles.'));
  files.push(asGeneratedFile(outputPath('static-web.js'), STATIC_WEB_JS, 'javascript', 'Local theme toggle and full-text page search.'));

  if (config.organization === 'single-page') {
    const renderedPages = new Map(pages.map((page) => [page.slug, renderPageContent(page, config, false, true).html]));
    const html = renderDocument(config, pages, undefined, {
      singlePage: true,
      inlineAssets: false,
      pageContents: renderedPages,
      template,
      siteName: spec.project.name,
    });
    files.push(asGeneratedFile(outputPath('index.html'), html, 'html', 'Single-page site with locally linked styles, script, and imported assets.'));
    files.push(...generateAssetFiles(config, outputDirectory));
    return files;
  }

  const firstPage = pages[0];
  for (const page of pages) {
    const html = renderDocument(config, pages, page, {
      singlePage: false,
      inlineAssets: false,
      template,
      siteName: spec.project.name,
    });
    files.push(asGeneratedFile(outputPath(`${page.slug}.html`), html, 'html', `Static page '${page.title}'.`));
  }
  if (firstPage) {
    const indexPage = renderDocument(config, pages, firstPage, {
      singlePage: false,
      inlineAssets: false,
      template,
      siteName: spec.project.name,
    });
    files.push(asGeneratedFile(outputPath('index.html'), indexPage, 'html', 'Site entry point.'));
  }

  files.push(...generateAssetFiles(config, outputDirectory));
  return files;
}
