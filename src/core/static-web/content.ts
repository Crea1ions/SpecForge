import YAML from 'yaml';
import { StaticWebPage } from '../types';

export interface MarkdownFrontmatter {
  title?: string;
  slug?: string;
  description?: string;
  order?: number;
  category?: string;
  tags?: string[];
  template?: string;
}

export interface ParsedMarkdownFile {
  page: StaticWebPage;
  metadata: MarkdownFrontmatter;
}

export function slugifyStaticWebValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function basename(path: string): string {
  const name = path.replace(/\\/g, '/').split('/').pop() ?? '';
  return name.replace(/\.md$/i, '') || 'page';
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    if (!value.every((tag) => typeof tag === 'string')) {
      throw new Error('La métadonnée frontmatter tags doit contenir uniquement des chaînes.');
    }
    return value.map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

export function parseMarkdownFile(
  filePath: string,
  source: string,
  fallbackOrder = 0,
): ParsedMarkdownFile {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.split('/').includes('..')) {
    throw new Error(`Chemin Markdown non sûr : '${filePath}'.`);
  }

  let markdown = source.replace(/^\uFEFF/, '');
  let rawMetadata: unknown = {};
  const frontmatter = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (frontmatter) {
    try {
      rawMetadata = YAML.parse(frontmatter[1]) ?? {};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Frontmatter YAML invalide dans '${normalizedPath}' : ${message}`);
    }
    if (typeof rawMetadata !== 'object' || rawMetadata === null || Array.isArray(rawMetadata)) {
      throw new Error(`Le frontmatter de '${normalizedPath}' doit être un objet YAML.`);
    }
    markdown = markdown.slice(frontmatter[0].length);
  }

  const sourceMetadata = rawMetadata as Record<string, unknown>;
  for (const key of ['title', 'slug', 'description', 'category', 'template']) {
    if (sourceMetadata[key] !== undefined && typeof sourceMetadata[key] !== 'string') {
      throw new Error(`La métadonnée frontmatter '${key}' doit être une chaîne dans '${normalizedPath}'.`);
    }
  }
  if (
    sourceMetadata.order !== undefined &&
    (typeof sourceMetadata.order !== 'number' || !Number.isFinite(sourceMetadata.order))
  ) {
    throw new Error(`La métadonnée frontmatter 'order' doit être un nombre dans '${normalizedPath}'.`);
  }
  if (
    sourceMetadata.tags !== undefined &&
    !Array.isArray(sourceMetadata.tags) &&
    typeof sourceMetadata.tags !== 'string'
  ) {
    throw new Error(`La métadonnée frontmatter 'tags' doit être une liste ou une chaîne dans '${normalizedPath}'.`);
  }
  const firstHeading = markdown.match(/^\s*#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim();
  const fallbackTitle = basename(normalizedPath).replace(/[-_]+/g, ' ');
  const title =
    typeof sourceMetadata.title === 'string' && sourceMetadata.title.trim()
      ? sourceMetadata.title.trim()
      : firstHeading || fallbackTitle;
  const metadataSlug =
    typeof sourceMetadata.slug === 'string' && sourceMetadata.slug.trim()
      ? slugifyStaticWebValue(sourceMetadata.slug)
      : '';
  const slug = metadataSlug || slugifyStaticWebValue(basename(normalizedPath)) || `page-${fallbackOrder + 1}`;
  const order = typeof sourceMetadata.order === 'number' ? sourceMetadata.order : fallbackOrder;
  const category = typeof sourceMetadata.category === 'string' ? sourceMetadata.category.trim() : '';
  const description =
    typeof sourceMetadata.description === 'string' ? sourceMetadata.description.trim() : '';
  const template = typeof sourceMetadata.template === 'string' ? sourceMetadata.template.trim() : undefined;

  const metadata: MarkdownFrontmatter = {
    title,
    slug,
    description,
    order,
    category,
    tags: normalizeTags(sourceMetadata.tags),
    ...(template ? { template } : {}),
  };

  return {
    metadata,
    page: {
      id: `page-${slug}`,
      title,
      slug,
      description,
      order,
      category,
      tags: metadata.tags ?? [],
      template,
      markdown: markdown.trim(),
      blocks: [],
      sourcePath: normalizedPath,
    },
  };
}

function samePage(left: StaticWebPage, right: StaticWebPage): boolean {
  return left.id === right.id &&
    left.title === right.title &&
    left.slug === right.slug &&
    left.description === right.description &&
    left.order === right.order &&
    left.category === right.category &&
    left.template === right.template &&
    JSON.stringify(left.tags) === JSON.stringify(right.tags) &&
    left.markdown === right.markdown &&
    JSON.stringify(left.blocks) === JSON.stringify(right.blocks);
}

export function isUnmodifiedStarterPage(
  page: StaticWebPage,
  starterPages: readonly StaticWebPage[],
): boolean {
  if (page.sourcePath) return false;
  return starterPages.some((starterPage) => samePage(page, starterPage));
}

export function mergeImportedMarkdownPages(
  existingPages: StaticWebPage[],
  importedPages: StaticWebPage[],
  starterPages: readonly StaticWebPage[],
): StaticWebPage[] {
  const importedPaths = new Set(importedPages.map((page) => page.sourcePath).filter(Boolean));
  const retainedPages = existingPages.filter(
    (page) =>
      !isUnmodifiedStarterPage(page, starterPages) &&
      (!page.sourcePath || !importedPaths.has(page.sourcePath)),
  );
  return [...retainedPages, ...importedPages].map((page, index) => ({
    ...page,
    order: Number.isFinite(page.order) ? page.order : index,
  }));
}

export function sortStaticWebPages(pages: StaticWebPage[]): StaticWebPage[] {
  return [...pages].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.slug.localeCompare(right.slug),
  );
}
