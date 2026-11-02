/**
 * SpecForge Core — UI/UX Bricks (templates applicatifs, hors Static Web)
 *
 * Définitions de bricks UI/UX : contrats sémantiques centralisés (identifiant,
 * catégorie, propriétés, variantes, compatibilités), sans génération liée à un
 * langage. Les rendus natifs sont portés par les implémentations de
 * `ui-ux/implementations/`.
 *
 * Ce module est indépendant du système Static Web (`core/static-web/`), qui
 * conserve ses propres définitions, son registre et son renderer.
 */

import {
  ApplicationTemplate,
  ProjectSpecification,
  ProjectUiUxBrickDefinition,
  ProjectUiUxConfig,
  TechnicalProfile,
  ValidationIssue,
} from '../types';
import { resolveStaticWebReferencePath } from '../static-web/content';
import { resolveUiUxTemplateIntegration } from './registry';
import { hasUiUxBrickImplementation } from './implementations';

const applicativeProfiles: TechnicalProfile[] = ['rust', 'python', 'typescript', 'go'];
// L'e-commerce est exclu : sa vitrine est pilotée par les données métier et ne
// compose pas de blocs de contenu (seul son thème est alimenté par la config).
const applicativeTemplates: ApplicationTemplate[] = [
  'web-frontend',
  'web-app',
  'web-platform',
  'api-service',
  'desktop',
  'mobile',
];

export const UI_UX_BRICKS: ProjectUiUxBrickDefinition[] = [
  {
    id: 'hero',
    name: 'Hero',
    description: 'Introductory page header with a title, message, and optional action.',
    category: 'structure',
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
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
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
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
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
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
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
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
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
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
    compatibleProfiles: applicativeProfiles,
    compatibleTemplates: applicativeTemplates,
    properties: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: 'Ready to begin?' },
      { key: 'text', label: 'Message', type: 'text', defaultValue: '' },
      { key: 'actionLabel', label: 'Action label', type: 'text', defaultValue: 'Get started' },
      { key: 'actionUrl', label: 'Action URL', type: 'url', defaultValue: '#top' },
    ],
  },
];

export class ProjectUiUxBrickRegistry {
  private readonly bricks = new Map<string, ProjectUiUxBrickDefinition>();

  constructor(definitions: ProjectUiUxBrickDefinition[] = UI_UX_BRICKS) {
    definitions.forEach((definition) => this.register(definition));
  }

  getAll(): ProjectUiUxBrickDefinition[] {
    return [...this.bricks.values()];
  }

  get(id: string): ProjectUiUxBrickDefinition | undefined {
    return this.bricks.get(id);
  }

  register(definition: ProjectUiUxBrickDefinition): void {
    this.bricks.set(definition.id, definition);
  }

  unregister(id: string): boolean {
    return this.bricks.delete(id);
  }
}

export const projectUiUxBrickRegistry = new ProjectUiUxBrickRegistry();

export function getProjectUiUxBrick(id: string): ProjectUiUxBrickDefinition | undefined {
  return projectUiUxBrickRegistry.get(id);
}

export function createProjectUiUxBlock(brickId: string, index = 0) {
  const definition = getProjectUiUxBrick(brickId);
  if (!definition) {
    throw new Error(`Unknown UI/UX brick: ${brickId}`);
  }

  return {
    id: `${brickId}-${index + 1}`,
    brickId,
    properties: Object.fromEntries(
      definition.properties.map((property) => [property.key, property.defaultValue]),
    ),
  };
}

export function isProjectUiUxBrickCompatible(
  brickId: string,
  profile: TechnicalProfile,
  template: ApplicationTemplate,
): boolean {
  const brick = projectUiUxBrickRegistry.get(brickId);
  return Boolean(
    brick &&
      brick.compatibleProfiles.includes(profile) &&
      (!brick.compatibleTemplates || brick.compatibleTemplates.includes(template)),
  );
}

/** Bricks réellement proposées pour un projet : compatibilité déclarée. */
export function getProjectUiUxBricksForSpec(spec: ProjectSpecification): ProjectUiUxBrickDefinition[] {
  return projectUiUxBrickRegistry
    .getAll()
    .filter((brick) =>
      brick.compatibleProfiles.includes(spec.profile) &&
      (!brick.compatibleTemplates || brick.compatibleTemplates.includes(spec.template)),
    );
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
    title: 'Configuration UI/UX invalide',
    message,
    source: 'configuration',
  };
}

function makeWarning(id: string, message: string): ValidationIssue {
  return {
    id,
    severity: 'warning',
    title: 'Configuration UI/UX à vérifier',
    message,
    source: 'configuration',
  };
}

/**
 * Validateur dédié aux templates applicatifs. Valide la configuration commune,
 * la compatibilité des bricks avec le profil/template, la disponibilité d'une
 * implémentation native pour la cible résolue et l'option `docsSite`.
 */
export function validateProjectUiUxConfig(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig | undefined,
): ValidationIssue[] {
  if (!config) return [];

  const integration = resolveUiUxTemplateIntegration(spec.profile, spec.template);
  const issues: ValidationIssue[] = [];

  if (config.docsSite && integration?.hasNativeUi) {
    issues.push({
      id: 'uiux-docs-site-with-native-ui',
      severity: 'error',
      title: 'Option documentaire incompatible',
      message:
        "L'option 'docs-site' est réservée aux templates sans interface native (API-only). " +
        'Ce template alimente son interface applicative avec la configuration UI/UX.',
      source: 'compatibility',
      fixSuggestion: 'Désactivez la génération du site documentaire.',
    });
  }

  if (!integration?.hasNativeUi && !config.docsSite) {
    const hasContent = config.pages.some(
      (page) => page.blocks.length > 0 || page.markdown.trim().length > 0,
    );
    if (hasContent) {
      issues.push(
        makeWarning(
          'uiux-config-without-output',
          "Ce template n'a pas d'interface native : la configuration UI/UX n'est appliquée que si la génération du site documentaire (docs-site/) est activée.",
        ),
      );
    }
  }

  if (integration?.hasNativeUi && integration.supportsContentPages === false) {
    const hasComposedContent = config.pages.some(
      (page) => page.blocks.length > 0 || page.markdown.trim().length > 0,
    );
    if (hasComposedContent) {
      issues.push(
        makeWarning(
          'uiux-template-theme-only',
          "L'interface de ce template est pilotée par ses données métier : seul le thème visuel est appliqué ; les pages et blocs configurés ne sont pas repris.",
        ),
      );
    }
  }

  if (!Array.isArray(config.pages)) {
    return [...issues, makeIssue('uiux-pages-invalid', 'La liste des pages doit être un tableau.')];
  }
  if (!Array.isArray(config.assets)) {
    return [...issues, makeIssue('uiux-assets-invalid', 'La liste des assets doit être un tableau.')];
  }
  if (!config.theme || typeof config.theme !== 'object') {
    return [...issues, makeIssue('uiux-theme-invalid', 'La configuration du thème doit être un objet.')];
  }

  if (!['content-driven', 'layout-driven'].includes(config.compositionMode)) {
    issues.push(makeIssue('uiux-composition-invalid', 'Le mode de composition doit être Content Driven ou Layout Driven.'));
  }
  if (!['single-page', 'multi-page', 'documentation'].includes(config.organization)) {
    issues.push(makeIssue('uiux-organization-invalid', 'L’organisation doit être Single Page, Multi-page ou Documentation.'));
  }
  if (!['sidebar', 'topbar', 'combined', 'burger'].includes(config.navigation)) {
    issues.push(makeIssue('uiux-navigation-invalid', 'Le mode de navigation n’est pas reconnu.'));
  }
  // displayMode est ignoré pour les templates applicatifs : leurs interfaces
  // générées embarquent par défaut un interrupteur clair/sombre.
  if (config.displayMode !== undefined && !['light', 'dark', 'system', 'toggle'].includes(config.displayMode)) {
    issues.push(makeIssue('uiux-display-mode-invalid', 'Le mode d’affichage doit être Light, Dark, System ou Toggle.'));
  }
  if (!['single-html', 'multi-file'].includes(config.exportMode)) {
    issues.push(makeIssue('uiux-export-mode-invalid', 'Le format d’export n’est pas reconnu.'));
  }
  if (
    config.contentInstruction !== undefined &&
    (typeof config.contentInstruction !== 'string' || config.contentInstruction.length > 2000)
  ) {
    issues.push(makeIssue('uiux-content-instruction-invalid', 'La consigne interne ne peut pas dépasser 2 000 caractères.'));
  }
  if (!['paper', 'ocean', 'obsidian', 'custom'].includes(config.theme.preset)) {
    issues.push(makeIssue('uiux-theme-preset-invalid', 'Le preset de thème n’est pas reconnu.'));
  }
  for (const [key, color] of Object.entries(config.theme)) {
    if (key !== 'preset' && (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))) {
      issues.push(makeIssue(`uiux-color-${key}`, `La couleur '${key}' doit être au format hexadécimal #RRGGBB.`));
    }
  }

  const seenSlugs = new Set<string>();
  const seenPageIds = new Set<string>();
  const knownAssets = new Set(
    config.assets
      .filter((asset) => asset && typeof asset.path === 'string')
      .map((asset) => asset.path.replace(/^\/+/, '')),
  );

  config.pages.forEach((page, index) => {
    if (!page || typeof page !== 'object') {
      issues.push(makeIssue(`uiux-page-invalid-${index}`, `La page à la position ${index + 1} doit être un objet.`));
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
      issues.push(makeIssue(`uiux-page-fields-${index}`, `La page à la position ${index + 1} a des champs de contenu invalides.`));
      return;
    }
    if (!Array.isArray(page.blocks)) {
      issues.push(makeIssue(`uiux-page-blocks-${index}`, `La liste de bricks de '${page.title}' doit être un tableau.`));
      return;
    }
    if (!page.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) {
      issues.push(makeIssue(`uiux-page-slug-${index}`, `Le slug '${page.slug}' n’est pas valide.`));
    } else if (seenSlugs.has(page.slug)) {
      issues.push(makeIssue(`uiux-page-duplicate-${index}`, `Le slug '${page.slug}' est utilisé par plusieurs pages.`));
    }
    seenSlugs.add(page.slug);
    if (seenPageIds.has(page.id)) {
      issues.push(makeIssue(`uiux-page-id-duplicate-${index}`, `L’identifiant de page '${page.id}' est dupliqué.`));
    }
    seenPageIds.add(page.id);
    if (!Number.isFinite(page.order)) {
      issues.push(makeIssue(`uiux-page-order-${index}`, `L’ordre d’affichage de la page '${page.title}' doit être un nombre.`));
    }
    if (page.template !== undefined && typeof page.template !== 'string') {
      issues.push(makeIssue(`uiux-page-template-${index}`, `Le template de la page '${page.title}' doit être une chaîne.`));
    }

    const blockIds = new Set<string>();
    for (const block of page.blocks) {
      if (!block || typeof block !== 'object' || typeof block.id !== 'string' || typeof block.brickId !== 'string' ||
          !block.properties || typeof block.properties !== 'object' || Array.isArray(block.properties)) {
        issues.push(makeIssue(`uiux-brick-invalid-${page.id}`, `Une définition de brick sur '${page.title}' est invalide.`));
        continue;
      }
      if (blockIds.has(block.id)) {
        issues.push(makeIssue(`uiux-block-duplicate-${index}-${block.id}`, `L’identifiant de brick '${block.id}' est dupliqué sur cette page.`));
      }
      blockIds.add(block.id);

      const definition = getProjectUiUxBrick(block.brickId);
      if (!definition) {
        issues.push(makeIssue(`uiux-brick-unknown-${block.id}`, `La brick '${block.brickId}' n’est pas disponible.`));
        continue;
      }
      if (!definition.compatibleProfiles.includes(spec.profile) ||
          (definition.compatibleTemplates && !definition.compatibleTemplates.includes(spec.template))) {
        issues.push(makeIssue(`uiux-brick-incompatible-${block.id}`, `La brick '${definition.name}' n’est pas compatible avec ce profil ou ce template.`));
      }
      if (
        integration?.hasNativeUi &&
        integration.target &&
        !hasUiUxBrickImplementation(block.brickId, integration.target)
      ) {
        issues.push({
          id: `uiux-brick-no-implementation-${block.id}`,
          severity: 'error',
          title: 'Implémentation native manquante',
          message: `La brick '${definition.name}' n’a pas d’implémentation pour la cible '${integration.target}' de ce template.`,
          source: 'compatibility',
          fixSuggestion: 'Retirez ce bloc ou choisissez une brick disponible pour ce template.',
        });
      }

      for (const property of definition.properties) {
        const value = block.properties[property.key];
        if (property.required && (value === undefined || value === null || value === '')) {
          issues.push(makeIssue(`uiux-brick-property-${block.id}-${property.key}`, `La propriété '${property.label}' est requise pour '${definition.name}'.`));
        }
        const validType =
          value === undefined ||
          (['text', 'markdown'].includes(property.type) && typeof value === 'string') ||
          (property.type === 'url' && typeof value === 'string') ||
          (property.type === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) ||
          (property.type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
          (property.type === 'boolean' && typeof value === 'boolean') ||
          (property.type === 'select' && typeof value === 'string' &&
            (!property.options || property.options.includes(value))) ||
          (property.type === 'list' &&
            (typeof value === 'string' ||
              (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))));
        if (!validType) {
          issues.push(makeIssue(`uiux-brick-type-${block.id}-${property.key}`, `La propriété '${property.label}' n’a pas le type ou la valeur attendu(e).`));
        }
        if (property.type === 'url' && typeof value === 'string' && value !== '') {
          if (!isSafeUrl(value)) {
            issues.push(makeIssue(`uiux-brick-url-${block.id}-${property.key}`, `L’URL '${value}' n’est pas autorisée dans '${definition.name}'.`));
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
              issues.push(makeWarning(`uiux-block-resource-${block.id}-${property.key}`, `La référence locale '${value}' est introuvable.`));
            }
          }
        }
        if (property.type === 'list' && block.brickId === 'gallery' && Array.isArray(value)) {
          value.forEach((entry, entryIndex) => {
            if (typeof entry !== 'string') return;
            const resolvedPath = resolveStaticWebReferencePath(entry, page.sourcePath);
            const imageAsset = config.assets.find((asset) =>
              asset && typeof asset.path === 'string' && resolvedPath !== undefined &&
              (asset.path === resolvedPath || asset.path.endsWith(`/${resolvedPath}`)),
            );
            if (resolvedPath === '' || resolvedPath === undefined || typeof imageAsset?.mediaType !== 'string' ||
                !imageAsset.mediaType.startsWith('image/')) {
              issues.push(makeWarning(`uiux-gallery-asset-${block.id}-${entryIndex}`, `L’asset de galerie '${entry}' est introuvable ou son chemin n’est pas sûr.`));
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
        issues.push(makeIssue(`uiux-url-${index}-${referenceIndex}`, `L’URL '${url}' n’est pas autorisée.`));
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
          issues.push(makeWarning(`uiux-reference-missing-${index}-${referenceIndex}`, `La ressource locale '${url}' est introuvable.`));
        }
      }
    }

    if (page.sourcePath && (
      page.sourcePath.startsWith('/') ||
      page.sourcePath.includes('\\') ||
      page.sourcePath.split('/').includes('..') ||
      !/\.md$/i.test(page.sourcePath)
    )) {
      issues.push(makeIssue(`uiux-source-path-${index}`, `Le chemin source '${page.sourcePath}' n’est pas sûr.`));
    }
  });

  const seenAssetPaths = new Set<string>();
  for (const asset of config.assets) {
    if (!asset || typeof asset !== 'object' || typeof asset.path !== 'string' ||
        typeof asset.mediaType !== 'string' || typeof asset.content !== 'string') {
      issues.push(makeIssue('uiux-asset-invalid', 'Une définition d’asset est invalide.'));
      continue;
    }
    if (
      !asset.path ||
      asset.path.startsWith('/') ||
      asset.path.includes('\\') ||
      asset.path.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
      /[:\u0000-\u001f]/.test(asset.path)
    ) {
      issues.push(makeIssue(`uiux-asset-path-${asset.path}`, `Le chemin d’asset '${asset.path}' n’est pas sûr.`));
    }
    if (seenAssetPaths.has(asset.path)) {
      issues.push(makeIssue(`uiux-asset-duplicate-${asset.path}`, `Le chemin d’asset '${asset.path}' est utilisé plusieurs fois.`));
    }
    seenAssetPaths.add(asset.path);
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(asset.mediaType) || !/^(?:[\da-zA-Z+/]{4})*(?:[\da-zA-Z+/]{2}==|[\da-zA-Z+/]{3}=)?$/.test(asset.content)) {
      issues.push(makeIssue(`uiux-asset-type-${asset.path}`, `Le type MIME de '${asset.path}' est invalide.`));
    }
    if (asset.encoding !== 'base64') {
      issues.push(makeIssue(`uiux-asset-encoding-${asset.path}`, `L’encodage de l’asset '${asset.path}' doit être base64.`));
    }
  }

  return issues;
}
