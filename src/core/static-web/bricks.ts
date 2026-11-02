import {
  ApplicationTemplate,
  StaticWebBrickDefinition,
  StaticWebConfig,
  StaticWebPage,
  TechnicalProfile,
  ValidationIssue,
} from '../types';
import { resolveStaticWebReferencePath } from './content';

const staticTemplates: ApplicationTemplate[] = [
  'static-documentation',
  'static-website',
  'static-landing-page',
];

const compatibleProfiles: TechnicalProfile[] = ['rust', 'python', 'typescript', 'go', 'static-web'];
const compatibleTemplates: ApplicationTemplate[] = [
  'web-frontend',
  'web-app',
  'web-platform',
  'ecommerce',
  'api-service',
  'desktop',
  'mobile',
  ...staticTemplates,
];

export const STATIC_WEB_BRICKS: StaticWebBrickDefinition[] = [
  {
    id: 'hero',
    name: 'Hero',
    description: 'Introductory page header with a title, message, and optional action.',
    category: 'structure',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: 'A new beginning', required: true },
      { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Tell visitors what matters.' },
      { key: 'actionLabel', label: 'Action label', type: 'text', defaultValue: 'Learn more' },
      { key: 'actionUrl', label: 'Action URL', type: 'url', defaultValue: '#content' },
    ],
  },
  {
    id: 'text-content',
    name: 'Text / Content',
    description: 'A Markdown content section.',
    category: 'content',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'heading', label: 'Heading', type: 'text', defaultValue: 'About' },
      { key: 'markdown', label: 'Content', type: 'markdown', defaultValue: 'Write your content here.' },
    ],
  },
  {
    id: 'features',
    name: 'Features / Cards',
    description: 'A responsive collection of feature cards.',
    category: 'content',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'heading', label: 'Heading', type: 'text', defaultValue: 'What you get' },
      { key: 'items', label: 'Cards', type: 'list', defaultValue: ['First feature', 'Second feature', 'Third feature'] },
    ],
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'A collection of locally managed image assets.',
    category: 'content',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'heading', label: 'Heading', type: 'text', defaultValue: 'Gallery' },
      { key: 'images', label: 'Image paths', type: 'list', defaultValue: [] },
    ],
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'A quote with an attribution.',
    category: 'marketing',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'quote', label: 'Quote', type: 'text', defaultValue: 'A thoughtful testimonial.' },
      { key: 'author', label: 'Author', type: 'text', defaultValue: 'A happy customer' },
      { key: 'role', label: 'Role', type: 'text', defaultValue: '' },
    ],
  },
  {
    id: 'call-to-action',
    name: 'Call To Action',
    description: 'A focused closing section with an optional link.',
    category: 'marketing',
    compatibleProfiles,
    compatibleTemplates,
    properties: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: 'Ready to begin?' },
      { key: 'text', label: 'Message', type: 'text', defaultValue: '' },
      { key: 'actionLabel', label: 'Action label', type: 'text', defaultValue: 'Get started' },
      { key: 'actionUrl', label: 'Action URL', type: 'url', defaultValue: '#top' },
    ],
  },
];

export class StaticWebBrickRegistry {
  private readonly bricks = new Map<string, StaticWebBrickDefinition>();

  constructor(definitions: StaticWebBrickDefinition[] = STATIC_WEB_BRICKS) {
    definitions.forEach((definition) => this.register(definition));
  }

  getAll(): StaticWebBrickDefinition[] {
    return [...this.bricks.values()];
  }

  get(id: string): StaticWebBrickDefinition | undefined {
    return this.bricks.get(id);
  }

  register(definition: StaticWebBrickDefinition): void {
    this.bricks.set(definition.id, definition);
  }

  unregister(id: string): boolean {
    return this.bricks.delete(id);
  }
}

export const staticWebBrickRegistry = new StaticWebBrickRegistry();

export function getStaticWebBrick(id: string): StaticWebBrickDefinition | undefined {
  return staticWebBrickRegistry.get(id);
}

export function createStaticWebBlock(brickId: string, index = 0) {
  const definition = getStaticWebBrick(brickId);
  if (!definition) {
    throw new Error(`Unknown Static Web brick: ${brickId}`);
  }

  return {
    id: `${brickId}-${index + 1}`,
    brickId,
    properties: Object.fromEntries(
      definition.properties.map((property) => [property.key, property.defaultValue]),
    ),
  };
}

function isSafeUrl(value: string): boolean {
  if (/[\u0000-\u001f]/.test(value) || value.startsWith('//') || value.startsWith('\\\\')) return false;
  const scheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme);
}

function makeIssue(id: string, message: string): ValidationIssue {
  return {
    id,
    severity: 'error',
    title: 'Configuration Static Web invalide',
    message,
    source: 'configuration',
  };
}

function makeReferenceIssue(
  profile: TechnicalProfile,
  id: string,
  message: string,
): ValidationIssue {
  return {
    id,
    severity: profile === 'static-web' ? 'error' : 'warning',
    title: profile === 'static-web' ? 'Configuration Static Web invalide' : 'Référence de contenu à vérifier',
    message,
    source: 'configuration',
  };
}

export function validateStaticWebConfig(
  profile: TechnicalProfile,
  template: ApplicationTemplate,
  config: StaticWebConfig | undefined,
): ValidationIssue[] {
  if (!config) {
    return profile === 'static-web'
      ? [makeIssue('static-web-config-missing', 'La configuration Static Web est obligatoire pour ce profil.')]
      : [];
  }

  const issues: ValidationIssue[] = [];
  if (!Array.isArray(config.pages)) {
    return [makeIssue('static-web-pages-invalid', 'La liste des pages doit être un tableau.')];
  }
  if (!Array.isArray(config.assets)) {
    return [makeIssue('static-web-assets-invalid', 'La liste des assets doit être un tableau.')];
  }
  if (!config.theme || typeof config.theme !== 'object') {
    return [makeIssue('static-web-theme-invalid', 'La configuration du thème doit être un objet.')];
  }
  const seenSlugs = new Set<string>();
  const seenPageIds = new Set<string>();
  const knownAssets = new Set(
    config.assets
      .filter((asset) => asset && typeof asset.path === 'string')
      .map((asset) => asset.path.replace(/^\/+/, '')),
  );

  if (profile === 'static-web' && !staticTemplates.includes(template)) {
    issues.push(makeIssue('static-web-template-invalid', 'Le profil Static Web exige un template Documentation, Website ou Landing Page.'));
  }
  if (!['content-driven', 'layout-driven'].includes(config.compositionMode)) {
    issues.push(makeIssue('static-web-composition-invalid', 'Le mode de composition doit être Content Driven ou Layout Driven.'));
  }
  if (!['single-page', 'multi-page', 'documentation'].includes(config.organization)) {
    issues.push(makeIssue('static-web-organization-invalid', 'L’organisation doit être Single Page, Multi-page ou Documentation.'));
  }
  if (!['sidebar', 'topbar', 'combined', 'burger'].includes(config.navigation)) {
    issues.push(makeIssue('static-web-navigation-invalid', 'Le mode de navigation n’est pas reconnu.'));
  }
  if (!['light', 'dark', 'system', 'toggle'].includes(config.displayMode)) {
    issues.push(makeIssue('static-web-display-mode-invalid', 'Le mode d’affichage doit être Light, Dark, System ou Toggle.'));
  }
  if (!['single-html', 'multi-file'].includes(config.exportMode)) {
    issues.push(makeIssue('static-web-export-mode-invalid', 'Le format d’export n’est pas reconnu.'));
  }
  if (
    config.contentInstruction !== undefined &&
    (typeof config.contentInstruction !== 'string' || config.contentInstruction.length > 2000)
  ) {
    issues.push(makeIssue('static-web-content-instruction-invalid', 'La consigne interne ne peut pas dépasser 2 000 caractères.'));
  }
  if (!['paper', 'ocean', 'obsidian', 'custom'].includes(config.theme.preset)) {
    issues.push(makeIssue('static-web-theme-preset-invalid', 'Le preset de thème n’est pas reconnu.'));
  }

  for (const [key, color] of Object.entries(config.theme)) {
    if (key !== 'preset' && (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))) {
      issues.push(makeIssue(`static-web-color-${key}`, `La couleur '${key}' doit être au format hexadécimal #RRGGBB.`));
    }
  }

  if (config.pages.length === 0) {
    issues.push(makeIssue('static-web-pages-empty', 'Ajoutez au moins une page Markdown ou un bloc de composition.'));
    return issues;
  }

  config.pages.forEach((page: StaticWebPage, index) => {
    if (!page || typeof page !== 'object') {
      issues.push(makeIssue(`static-web-page-invalid-${index}`, `La page à la position ${index + 1} doit être un objet.`));
      return;
    }
    if (
      typeof page.id !== 'string' ||
      typeof page.title !== 'string' ||
      typeof page.slug !== 'string' ||
      typeof page.description !== 'string' ||
      typeof page.category !== 'string' ||
      typeof page.markdown !== 'string' ||
      !Array.isArray(page.tags) ||
      !page.tags.every((tag) => typeof tag === 'string') ||
      (page.sourcePath !== undefined && typeof page.sourcePath !== 'string')
    ) {
      issues.push(makeIssue(`static-web-page-fields-${index}`, `La page à la position ${index + 1} a des champs de contenu invalides.`));
      return;
    }
    if (!Array.isArray(page.blocks)) {
      issues.push(makeIssue(`static-web-page-blocks-${index}`, `La liste de bricks de '${page.title}' doit être un tableau.`));
      return;
    }
    if (!page.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) {
      issues.push(makeIssue(`static-web-page-slug-${index}`, `Le slug '${page.slug}' n’est pas valide.`));
    } else if (seenSlugs.has(page.slug)) {
      issues.push(makeIssue(`static-web-page-duplicate-${index}`, `Le slug '${page.slug}' est utilisé par plusieurs pages.`));
    }
    seenSlugs.add(page.slug);
    if (seenPageIds.has(page.id)) {
      issues.push(makeIssue(`static-web-page-id-duplicate-${index}`, `L’identifiant de page '${page.id}' est dupliqué.`));
    }
    seenPageIds.add(page.id);

    if (!Number.isFinite(page.order)) {
      issues.push(makeIssue(`static-web-page-order-${index}`, `L’ordre d’affichage de la page '${page.title}' doit être un nombre.`));
    }
    if (page.template !== undefined && typeof page.template !== 'string') {
      issues.push(makeIssue(`static-web-page-template-${index}`, `Le template de la page '${page.title}' doit être une chaîne.`));
    }

    for (const block of page.blocks) {
      if (!block || typeof block !== 'object' || typeof block.id !== 'string' || typeof block.brickId !== 'string' ||
          !block.properties || typeof block.properties !== 'object' || Array.isArray(block.properties)) {
        issues.push(makeIssue(`static-web-brick-invalid-${page.id}`, `Une définition de brick sur '${page.title}' est invalide.`));
        continue;
      }
      const definition = getStaticWebBrick(block.brickId);
      if (!definition) {
        issues.push(makeIssue(`static-web-brick-unknown-${block.id}`, `La brick '${block.brickId}' n’est pas disponible.`));
        continue;
      }
      if (!definition.compatibleProfiles.includes(profile) ||
          (definition.compatibleTemplates && !definition.compatibleTemplates.includes(template))) {
        issues.push(makeIssue(`static-web-brick-incompatible-${block.id}`, `La brick '${definition.name}' n’est pas compatible avec ce profil ou ce template.`));
      }

      for (const property of definition.properties) {
        const value = block.properties[property.key];
        if (property.required && (value === undefined || value === null || value === '')) {
          issues.push(makeIssue(`static-web-brick-property-${block.id}-${property.key}`, `La propriété '${property.label}' est requise pour '${definition.name}'.`));
        }
        const validType =
          value === undefined ||
          (property.type === 'text' && typeof value === 'string') ||
          (property.type === 'markdown' && typeof value === 'string') ||
          (property.type === 'url' && typeof value === 'string') ||
          (property.type === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) ||
          (property.type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
          (property.type === 'boolean' && typeof value === 'boolean') ||
          (property.type === 'select' &&
            typeof value === 'string' &&
            (!property.options || property.options.includes(value))) ||
          (property.type === 'list' &&
            (typeof value === 'string' ||
              (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))));
        if (!validType) {
          issues.push(makeIssue(`static-web-brick-type-${block.id}-${property.key}`, `La propriété '${property.label}' n’a pas le type ou la valeur attendu(e).`));
        }
        if (property.type === 'url' && typeof value === 'string' && value !== '') {
          if (!isSafeUrl(value)) {
            issues.push(makeIssue(`static-web-brick-url-${block.id}-${property.key}`, `L’URL '${value}' n’est pas autorisée dans '${definition.name}'.`));
          } else if (!value.startsWith('#') && !/^[a-z][a-z\d+.-]*:/i.test(value)) {
            const assetPath = resolveStaticWebReferencePath(value, page.sourcePath);
            const pageExists = config.pages.some((candidate) =>
              Boolean(candidate) && (
                assetPath === `${candidate.slug}.html` ||
                assetPath === `${candidate.slug}.md` ||
                (typeof candidate.sourcePath === 'string' && assetPath === candidate.sourcePath)
              ),
            );
            const assetExists = assetPath !== undefined && assetPath !== '' &&
              (knownAssets.has(assetPath) || [...knownAssets].some((asset) => asset.endsWith(`/${assetPath}`)));
            if (!pageExists && !assetExists) {
              issues.push(makeReferenceIssue(profile, `static-web-block-resource-${block.id}-${property.key}`, `La référence locale '${value}' est introuvable.`));
            }
          }
        }
        if (property.type === 'list' && block.brickId === 'gallery' && Array.isArray(value)) {
          value.forEach((entry, entryIndex) => {
            if (typeof entry !== 'string') return;
            const resolvedPath = resolveStaticWebReferencePath(entry, page.sourcePath);
            const imageAsset = config.assets.find((asset) =>
              asset && typeof asset.path === 'string' &&
              (asset.path === resolvedPath || asset.path.endsWith(`/${resolvedPath}`)),
            );
            if (resolvedPath === '' || typeof imageAsset?.mediaType !== 'string' ||
                !imageAsset.mediaType.startsWith('image/')) {
              issues.push(makeReferenceIssue(profile, `static-web-gallery-asset-${block.id}-${entryIndex}`, `L’asset de galerie '${entry}' est introuvable ou son chemin n’est pas sûr.`));
            }
          });
        }
      }
    }

    const references = page.markdown.match(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g) ?? [];
    for (const [referenceIndex, reference] of references.entries()) {
      const match = reference.match(/\(([^)\s]+)/);
      const url = match?.[1];
      if (!url) continue;
      if (!isSafeUrl(url)) {
        issues.push(makeIssue(`static-web-url-${index}-${referenceIndex}`, `L’URL '${url}' n’est pas autorisée.`));
      } else if (!url.startsWith('#') && !/^[a-z][a-z\d+.-]*:/i.test(url)) {
        const assetPath = resolveStaticWebReferencePath(url, page.sourcePath);
        const referencedPage = config.pages.some((candidate) =>
          Boolean(candidate) && (
            assetPath === `${candidate.slug}.md` ||
            assetPath === `${candidate.slug}.html` ||
            (typeof candidate.sourcePath === 'string' && assetPath === candidate.sourcePath)
          ),
        );
        const assetExists = assetPath !== undefined && assetPath !== '' &&
          (knownAssets.has(assetPath) || [...knownAssets].some((asset) => asset.endsWith(`/${assetPath}`)));
        if (!assetExists && !referencedPage) {
          issues.push(makeReferenceIssue(profile, `static-web-reference-missing-${index}-${referenceIndex}`, `La ressource locale '${url}' est introuvable.`));
        } else if (reference.startsWith('!') && assetExists) {
          const imageAsset = config.assets.find((asset) =>
            asset && typeof asset.path === 'string' &&
            (asset.path === assetPath || asset.path.endsWith(`/${assetPath}`)),
          );
          if (imageAsset && typeof imageAsset.mediaType === 'string' &&
              !imageAsset.mediaType.startsWith('image/')) {
            issues.push(makeReferenceIssue(profile, `static-web-reference-not-image-${index}-${referenceIndex}`, `La ressource '${url}' n’est pas une image.`));
          }
        }
      }
    }

    if (page.sourcePath && (
      page.sourcePath.startsWith('/') ||
      page.sourcePath.includes('\\') ||
      page.sourcePath.split('/').includes('..') ||
      !/\.md$/i.test(page.sourcePath)
    )) {
      issues.push(makeIssue(`static-web-source-path-${index}`, `Le chemin source '${page.sourcePath}' n’est pas sûr.`));
    }
    const blockIds = new Set<string>();
    for (const block of page.blocks) {
      if (!block || typeof block !== 'object' || typeof block.id !== 'string') continue;
      if (blockIds.has(block.id)) {
        issues.push(makeIssue(`static-web-block-duplicate-${index}-${block.id}`, `L’identifiant de brick '${block.id}' est dupliqué sur cette page.`));
      }
      blockIds.add(block.id);
    }
  });

  const seenAssetPaths = new Set<string>();
  for (const asset of config.assets) {
    if (!asset || typeof asset !== 'object' || typeof asset.path !== 'string' ||
        typeof asset.mediaType !== 'string' || typeof asset.content !== 'string') {
      issues.push(makeIssue('static-web-asset-invalid', 'Une définition d’asset est invalide.'));
      continue;
    }
    if (
      !asset.path ||
      asset.path.startsWith('/') ||
      asset.path.includes('\\') ||
      asset.path.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
      /[:\u0000-\u001f]/.test(asset.path)
    ) {
      issues.push(makeIssue(`static-web-asset-path-${asset.path}`, `Le chemin d’asset '${asset.path}' n’est pas sûr.`));
    }
    if (seenAssetPaths.has(asset.path)) {
      issues.push(makeIssue(`static-web-asset-duplicate-${asset.path}`, `Le chemin d’asset '${asset.path}' est utilisé plusieurs fois.`));
    }
    seenAssetPaths.add(asset.path);
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(asset.mediaType) || !/^(?:[\da-zA-Z+/]{4})*(?:[\da-zA-Z+/]{2}==|[\da-zA-Z+/]{3}=)?$/.test(asset.content)) {
      issues.push(makeIssue(`static-web-asset-type-${asset.path}`, `Le type MIME de '${asset.path}' est invalide.`));
    }
    if (asset.encoding !== 'base64') {
      issues.push(makeIssue(`static-web-asset-encoding-${asset.path}`, `L’encodage de l’asset '${asset.path}' doit être base64.`));
    }
  }

  return issues;
}

export function isStaticWebBrickCompatible(
  brickId: string,
  profile: TechnicalProfile,
  template: ApplicationTemplate,
): boolean {
  const brick = staticWebBrickRegistry.get(brickId);
  return Boolean(
    brick &&
      brick.compatibleProfiles.includes(profile) &&
      (!brick.compatibleTemplates || brick.compatibleTemplates.includes(template)),
  );
}
