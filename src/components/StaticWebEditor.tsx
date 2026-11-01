import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Download, Loader2 } from 'lucide-react';
import {
  ApplicationTemplate,
  ProjectSpecification,
  ResolvedArchitecture,
  StaticWebBrickPropertyDefinition,
  StaticWebConfig,
  StaticWebPage,
} from '../core';
import { findPreset, PRESETS } from '../engine/presets';
import {
  createStaticWebBlock,
  getProjectUiUxConfig,
  isUnmodifiedStarterPage,
  mergeImportedMarkdownPages,
  parseMarkdownFile,
  renderStaticWebPreview,
  STATIC_WEB_BRICKS,
} from '../core';
import {
  resolveUiUxOutputDirectory,
  resolveUiUxPresentationTemplate,
} from '../core/static-web/config';

interface StaticWebEditorProps {
  spec: ProjectSpecification;
  onChange: (updated: ProjectSpecification) => void;
  architecture: ResolvedArchitecture;
  canGenerate: boolean;
  isDownloading: boolean;
  onProjectNameChange: (name: string) => void;
  onDownloadZip: () => void;
  onDownloadHtml: () => void;
  onOpenArchitecture: () => void;
}

type PreviewWidth = 'desktop' | 'tablet' | 'mobile';
type StaticWebStep = 'type' | 'content' | 'structure' | 'appearance' | 'generation';
type EditorArea = StaticWebStep;
type MobilePanel = 'configuration' | 'preview';

const staticWebSteps: StaticWebStep[] = ['type', 'content', 'structure', 'appearance', 'generation'];
const staticWebStarterPages = PRESETS
  .flatMap((preset) => preset.spec.staticWeb?.pages ?? preset.spec.uiUx?.pages ?? []);
const MAX_UPLOAD_FILES = 500;
const MAX_MARKDOWN_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MARKDOWN_TOTAL_SIZE = 20 * 1024 * 1024;
const MAX_ASSET_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ASSET_TOTAL_SIZE = 20 * 1024 * 1024;

const previewWidths: Record<PreviewWidth, number | '100%'> = {
  desktop: '100%',
  tablet: 768,
  mobile: 390,
};

const templateOptions: Array<{ value: ApplicationTemplate; label: string; description: string }> = [
  {
    value: 'static-documentation',
    label: 'Documentation',
    description: 'Des pages organisées par rubriques.',
  },
  {
    value: 'static-website',
    label: 'Site web',
    description: 'Un site classique avec plusieurs pages.',
  },
  {
    value: 'static-landing-page',
    label: 'Page de présentation',
    description: 'Une page unique pour présenter un projet ou une offre.',
  },
];

const organizationOptions: Array<{ value: StaticWebConfig['organization']; label: string }> = [
  { value: 'single-page', label: 'Une page longue' },
  { value: 'multi-page', label: 'Plusieurs pages séparées' },
  { value: 'documentation', label: 'Documentation par rubriques' },
];

const navigationOptions: Array<{
  value: Extract<StaticWebConfig['navigation'], 'sidebar' | 'burger'>;
  label: string;
}> = [
  { value: 'sidebar', label: 'Menu latéral' },
  { value: 'burger', label: 'Menu burger déroulant' },
];

const displayModeOptions: Array<{ value: StaticWebConfig['displayMode']; label: string }> = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Selon l’appareil' },
  { value: 'toggle', label: 'Laisser le choix au visiteur' },
];

const themePresets: Record<
  Exclude<StaticWebConfig['theme']['preset'], 'custom'>,
  Omit<StaticWebConfig['theme'], 'preset'>
> = {
  paper: {
    primary: '#2563eb',
    accent: '#0f766e',
    background: '#ffffff',
    text: '#1f2937',
    darkBackground: '#111827',
    darkText: '#f3f4f6',
  },
  ocean: {
    primary: '#2563eb',
    accent: '#14b8a6',
    background: '#f8fafc',
    text: '#172033',
    darkBackground: '#0b1020',
    darkText: '#e5e7eb',
  },
  obsidian: {
    primary: '#7c3aed',
    accent: '#f59e0b',
    background: '#f9fafb',
    text: '#1f2937',
    darkBackground: '#111827',
    darkText: '#f3f4f6',
  },
};

const themePresetLabels: Record<StaticWebConfig['theme']['preset'], string> = {
  paper: 'Paper',
  ocean: 'Ocean',
  obsidian: 'Obsidian',
  custom: 'Personnalisé',
};

const stepTitles: Record<StaticWebStep, string> = {
  type: 'Type de site',
  content: 'Contenu',
  structure: 'Structure',
  appearance: 'Apparence',
  generation: 'Génération',
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function reorder<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function propertyInputTypeForEditor(type: StaticWebBrickPropertyDefinition['type']): string {
  if (type === 'color' || type === 'url' || type === 'number') return type;
  return 'text';
}

export const StaticWebEditor: React.FC<StaticWebEditorProps> = ({
  spec,
  onChange,
  architecture,
  canGenerate,
  isDownloading,
  onProjectNameChange,
  onDownloadZip,
  onDownloadHtml,
  onOpenArchitecture,
}) => {
  const isStaticWeb = spec.profile === 'static-web';
  const config = getProjectUiUxConfig(spec);
  const [selectedPageId, setSelectedPageId] = useState(config?.pages?.[0]?.id ?? '');
  const [selectedBrick, setSelectedBrick] = useState(STATIC_WEB_BRICKS[0]?.id ?? '');
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('configuration');
  const [openSteps, setOpenSteps] = useState<Set<StaticWebStep>>(() => new Set(['type']));
  const [completedSteps, setCompletedSteps] = useState<Set<StaticWebStep>>(() => new Set());
  const [editingSteps, setEditingSteps] = useState<Set<StaticWebStep>>(() => new Set());
  const [importError, setImportError] = useState<string | null>(null);
  const directoryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    directoryInput.current?.setAttribute('webkitdirectory', '');
  }, []);

  const currentPage = Array.isArray(config?.pages)
    ? config.pages.find((page) => page.id === selectedPageId) ?? config.pages[0]
    : undefined;
  const preview = useMemo(() => {
    if (!config) return { html: '', error: 'La configuration Static Web est absente.' };
    try {
      return {
        html: renderStaticWebPreview(
          { ...config, displayMode: previewTheme },
          currentPage?.slug,
          resolveUiUxPresentationTemplate(spec),
          spec.project.name,
        ),
        error: null,
      };
    } catch (error) {
      return {
        html: '',
        error: error instanceof Error ? error.message : 'Le moteur de prévisualisation a échoué.',
      };
    }
  }, [config, currentPage?.slug, previewTheme, spec, spec.project.name]);

  if (!config || !Array.isArray(config.pages) || !Array.isArray(config.assets) || !config.theme) {
    return (
      <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
        La configuration d’interface et de contenu est absente de la spécification.
      </p>
    );
  }

  const markStepInProgress = (step: StaticWebStep) => {
    setEditingSteps((current) => new Set(current).add(step));
    setCompletedSteps((current) => {
      const next = new Set(current);
      next.delete(step);
      return next;
    });
  };

  const updateConfig = (update: (current: StaticWebConfig) => StaticWebConfig, area?: EditorArea) => {
    if (area) markStepInProgress(area);
    onChange(isStaticWeb
      ? { ...spec, staticWeb: update(config) }
      : { ...spec, uiUx: update(config) });
  };

  const updatePage = (
    pageId: string,
    update: (page: StaticWebPage) => StaticWebPage,
    area: EditorArea = 'content',
  ) => {
    markStepInProgress(area);
    updateConfig((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === pageId ? update(page) : page)),
    }));
  };

  const importMarkdownFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > MAX_UPLOAD_FILES) {
      setImportError(`Le dossier contient ${files.length} fichiers. La limite est de ${MAX_UPLOAD_FILES} fichiers par import.`);
      return;
    }

    const markdownFiles: File[] = [];
    let totalSize = 0;
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (!/\.md$/i.test(file.name)) continue;
      if (file.size > MAX_MARKDOWN_FILE_SIZE) {
        setImportError(`'${file.name}' dépasse la limite de 5 Mo par fichier Markdown.`);
        return;
      }
      totalSize += file.size;
      if (totalSize > MAX_MARKDOWN_TOTAL_SIZE) {
        setImportError('La taille totale des fichiers Markdown dépasse la limite de 20 Mo par import.');
        return;
      }
      markdownFiles.push(file);
    }
    if (!markdownFiles.length) {
      setImportError('Aucun fichier .md n’a été sélectionné. Les autres formats sont ignorés.');
      return;
    }

    const imported: StaticWebPage[] = [];
    const errors: string[] = [];
    for (const [index, file] of markdownFiles.entries()) {
      try {
        const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        imported.push(parseMarkdownFile(path, await file.text(), config.pages.length + index).page);
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Impossible de lire ce fichier.'}`);
      }
    }
    if (imported.length === 0) {
      setImportError(errors.join('\n') || 'Aucun fichier Markdown valide n’a été importé.');
      return;
    }

    markStepInProgress('content');
    const pages = mergeImportedMarkdownPages(config.pages, imported, staticWebStarterPages);
    updateConfig((current) => ({ ...current, pages }));
    setSelectedPageId(imported[0].id);
    setImportError(errors.length ? errors.join('\n') : null);
  };

  const importAssets = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      if (files.length > MAX_UPLOAD_FILES) {
        throw new Error(`L’import contient ${files.length} fichiers. La limite est de ${MAX_UPLOAD_FILES} fichiers.`);
      }
      const imported: StaticWebConfig['assets'] = [];
      let totalSize = 0;
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        if (file.size > MAX_ASSET_FILE_SIZE) {
          throw new Error(`'${file.name}' dépasse la limite de 5 Mo par ressource.`);
        }
        totalSize += file.size;
        if (totalSize > MAX_ASSET_TOTAL_SIZE) {
          throw new Error('La taille totale des ressources dépasse la limite de 20 Mo par import.');
        }
        const path = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name)
          .replace(/\\/g, '/')
          .replace(/^\/+/, '');
        if (!path || path.split('/').includes('..')) {
          throw new Error(`Chemin d’asset non sûr : '${path}'.`);
        }
        imported.push({
          path,
          mediaType: file.type || 'application/octet-stream',
          content: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
          encoding: 'base64',
        });
      }
      const importedPaths = new Set(imported.map((asset) => asset.path));
      markStepInProgress('content');
      updateConfig((current) => ({
        ...current,
        assets: [...current.assets.filter((asset) => !importedPaths.has(asset.path)), ...imported],
      }));
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Impossible de lire les assets sélectionnés.');
    }
  };

  const movePage = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= config.pages.length) return;
    const pages = reorder(config.pages, index, target).map((page, order) => ({ ...page, order }));
    updateConfig((current) => ({ ...current, pages }), 'structure');
  };

  const addPage = () => {
    markStepInProgress('content');
    const order = config.pages.length;
    const page: StaticWebPage = {
      id: `page-new-${order + 1}`,
      title: `Nouvelle page ${order + 1}`,
      slug: `nouvelle-page-${order + 1}`,
      description: '',
      order,
      category: '',
      tags: [],
      markdown: '# Nouvelle page\n\nAjoutez votre contenu ici.',
      blocks: [],
    };
    updateConfig((current) => ({ ...current, pages: [...current.pages, page] }));
    setSelectedPageId(page.id);
  };

  const removePage = (pageId: string) => {
    if (config.pages.length <= 1) return;
    markStepInProgress('content');
    const pages = config.pages.filter((page) => page.id !== pageId).map((page, order) => ({ ...page, order }));
    updateConfig((current) => ({ ...current, pages }));
    if (selectedPageId === pageId) setSelectedPageId(pages[0].id);
  };

  const addBlock = () => {
    if (!currentPage || !selectedBrick) return;
    const nextBlock = createStaticWebBlock(selectedBrick, currentPage.blocks.length);
    let suffix = currentPage.blocks.length + 1;
    while (currentPage.blocks.some((block) => block.id === nextBlock.id)) {
      suffix++;
      nextBlock.id = `${selectedBrick}-${suffix}`;
    }
    updatePage(currentPage.id, (page) => ({ ...page, blocks: [...page.blocks, nextBlock] }), 'structure');
  };

  const updateBlockProperty = (
    blockId: string,
    property: StaticWebBrickPropertyDefinition,
    rawValue: string | boolean,
  ) => {
    if (!currentPage) return;
    const converted =
      property.type === 'number' && typeof rawValue === 'string'
        ? Number(rawValue)
        : property.type === 'list' && typeof rawValue === 'string'
          ? rawValue.split('\n').map((item) => item.trim()).filter(Boolean)
          : rawValue;
    updatePage(
      currentPage.id,
      (page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.id === blockId
            ? { ...block, properties: { ...block.properties, [property.key]: converted } }
            : block,
        ),
      }),
      'structure',
    );
  };

  const handleTemplateSelect = (template: ApplicationTemplate) => {
    const preset = findPreset('static-web', template);
    if (!preset?.spec.staticWeb) {
      setImportError(`Le template '${template}' n’est pas disponible.`);
      return;
    }
    const currentPreset = findPreset('static-web', spec.template);
    const currentDefaults = currentPreset?.spec.staticWeb;
    const targetDefaults = preset.spec.staticWeb;
    const pagesAreStarterContent = config.pages.length === 0 ||
      config.pages.every((page) => isUnmodifiedStarterPage(page, staticWebStarterPages));
    const nextConfig: StaticWebConfig = {
      ...config,
      compositionMode: currentDefaults?.compositionMode === config.compositionMode
        ? targetDefaults.compositionMode
        : config.compositionMode,
      organization: currentDefaults?.organization === config.organization
        ? targetDefaults.organization
        : config.organization,
      navigation: navigationOptions.some((option) => option.value === config.navigation)
        ? currentDefaults?.navigation === config.navigation
          ? targetDefaults.navigation
          : config.navigation
        : targetDefaults.navigation,
      displayMode: currentDefaults?.displayMode === config.displayMode
        ? targetDefaults.displayMode
        : config.displayMode,
      exportMode: currentDefaults?.exportMode === config.exportMode
        ? targetDefaults.exportMode
        : config.exportMode,
      theme: currentDefaults && JSON.stringify(config.theme) === JSON.stringify(currentDefaults.theme)
        ? { ...targetDefaults.theme }
        : config.theme,
      pages: pagesAreStarterContent ? targetDefaults.pages.map((page) => ({ ...page, blocks: page.blocks.map((block) => ({ ...block, properties: { ...block.properties } })) })) : config.pages,
    };
    const project = { ...spec.project };
    if (currentPreset) {
      for (const key of ['name', 'slug', 'description'] as const) {
        if (project[key] === currentPreset.spec.project[key]) {
          project[key] = preset.spec.project[key];
        }
      }
    }
    markStepInProgress('type');
    onChange({ ...spec, template, project, staticWeb: nextConfig });
    if (pagesAreStarterContent && targetDefaults.pages[0]) {
      setSelectedPageId(targetDefaults.pages[0].id);
    }
    setImportError(null);
  };

  const isStepReady = (step: StaticWebStep): boolean => {
    switch (step) {
      case 'type':
        return isStaticWeb
          ? templateOptions.some((option) => option.value === spec.template)
          : Boolean(findPreset(spec.profile, spec.template));
      case 'content':
        return config.pages.length > 0;
      case 'structure':
        return config.pages.length > 0 && organizationOptions.some((option) => option.value === config.organization);
      case 'appearance':
        return Boolean(config.theme.preset) &&
          navigationOptions.some((option) => option.value === config.navigation) &&
          displayModeOptions.some((option) => option.value === config.displayMode);
      case 'generation':
        return architecture.isValid && canGenerate;
    }
  };

  const stepStatus = (step: StaticWebStep): string => {
    if (completedSteps.has(step)) return 'Configuré';
    if (editingSteps.has(step) || openSteps.has(step)) return 'En cours';
    return isStepReady(step) ? 'Configuré' : 'À configurer';
  };

  const toggleStep = (step: StaticWebStep) => {
    setOpenSteps((current) => {
      const next = new Set(current);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const completeStep = (step: StaticWebStep) => {
    if (!isStepReady(step)) return;
    setCompletedSteps((current) => new Set(current).add(step));
    setEditingSteps((current) => {
      const next = new Set(current);
      next.delete(step);
      return next;
    });
    const index = staticWebSteps.indexOf(step);
    const followingStep = staticWebSteps[index + 1];
    setOpenSteps(new Set(followingStep ? [followingStep] : []));
  };

  const selectMobilePanel = (panel: MobilePanel) => {
    setMobilePanel(panel);
    window.requestAnimationFrame(() => {
      document.getElementById(`static-web-${panel}-panel`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const renderStep = (
    step: StaticWebStep,
    number: string,
    summary: string,
    content: React.ReactNode,
  ) => {
    const isOpen = openSteps.has(step);
    const status = stepStatus(step);
    const isComplete = isStepReady(step);
    const statusClass = status === 'Configuré'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : status === 'En cours'
        ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'
        : 'border-neutral-700 bg-neutral-800 text-neutral-300';

    return (
      <li key={step} className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900/60">
        <button
          type="button"
          id={`static-web-${step}-toggle`}
          aria-expanded={isOpen}
          aria-controls={`static-web-${step}-panel`}
          onClick={() => toggleStep(step)}
          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-neutral-800/70 sm:p-4"
        >
          <span className="font-mono text-xs text-neutral-500">{number}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-neutral-100">{stepTitles[step]}</span>
            <span className="mt-0.5 block truncate text-xs text-neutral-400">{summary}</span>
          </span>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass}`}>
            {status}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-400 transition ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div id={`static-web-${step}-panel`} hidden={!isOpen} className="border-t border-neutral-700 p-3 sm:p-4">
          <div className="space-y-4">{content}</div>
          {step !== 'generation' && (
            <div className="mt-5 flex justify-end border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => completeStep(step)}
                disabled={!isComplete}
                className="ov-button-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isComplete ? 'Valider et continuer' : 'Complétez cette étape pour continuer'}
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  const selectedTemplate = isStaticWeb
    ? templateOptions.find((option) => option.value === spec.template)?.label
    : findPreset(spec.profile, spec.template)?.name ?? spec.template;
  const organizationLabel = organizationOptions.find((option) => option.value === config.organization)?.label ?? 'À choisir';
  const navigationLabel = navigationOptions.find((option) => option.value === config.navigation)?.label ?? 'Ancien réglage';
  const displayModeLabel = displayModeOptions.find((option) => option.value === config.displayMode)?.label ?? 'À choisir';
  const pageSummary = config.pages.map((page) => page.title).join(' → ');
  const configuredCount = staticWebSteps.filter((step) => stepStatus(step) === 'Configuré').length;
  const architectureErrors = architecture.issues.filter((issue) => issue.severity === 'error');

  const contentStep = (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-neutral-400">
        Importez vos documents Markdown ou rédigez vos pages directement. Seuls les fichiers .md sont lus. Chaque import est limité à 500 fichiers et 20 Mo.
      </p>
      <label className="block text-xs text-neutral-300">
        Consigne interne sur l’usage des pages
        <textarea
          value={config.contentInstruction ?? ''}
          maxLength={2000}
          rows={3}
          onChange={(event) =>
            updateConfig((current) => ({ ...current, contentInstruction: event.target.value }), 'content')
          }
          className="ov-field mt-1 w-full rounded-lg px-3 py-2"
          placeholder="Ex. : Les pages importées constituent le guide interne destiné aux équipes produit."
        />
        <span className="mt-1 block text-[11px] text-neutral-500">
          Cette consigne reste interne à la spécification et n’est pas publiée dans les pages du site.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="ov-button-secondary cursor-pointer px-3 py-2 text-xs">
          Importer des fichiers Markdown
          <input
            type="file"
            accept=".md,text/markdown"
            multiple
            className="sr-only"
            onChange={(event) => void importMarkdownFiles(event.target.files)}
          />
        </label>
        <label className="ov-button-secondary cursor-pointer px-3 py-2 text-xs">
          Importer un dossier
          <input
            ref={directoryInput}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="sr-only"
            onChange={(event) => void importMarkdownFiles(event.target.files)}
          />
        </label>
        <label className="ov-button-secondary cursor-pointer px-3 py-2 text-xs">
          Ajouter des ressources
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => void importAssets(event.target.files)}
          />
        </label>
        <button type="button" onClick={addPage} className="ov-button-secondary px-3 py-2 text-xs">
          Ajouter une page
        </button>
      </div>
      {importError && (
        <p role="alert" className="whitespace-pre-line rounded-lg bg-red-950/40 p-2 text-xs text-red-200">
          {importError}
        </p>
      )}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-neutral-200">Pages ({config.pages.length})</h5>
        <ul className="space-y-1.5">
          {config.pages.map((page) => (
            <li key={page.id} className="flex items-center gap-2 rounded-lg border border-neutral-700 p-1.5">
              <button
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                aria-current={currentPage?.id === page.id ? 'page' : undefined}
                className={`min-w-0 flex-1 truncate rounded px-2 py-2 text-left text-xs ${
                  currentPage?.id === page.id
                    ? 'bg-indigo-500/20 text-indigo-100'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {page.title}
              </button>
              <button
                type="button"
                aria-label={`Supprimer ${page.title}`}
                disabled={config.pages.length <= 1}
                onClick={() => removePage(page.id)}
                className="rounded px-2 py-1 text-red-300 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
      {currentPage && (
        <div className="space-y-3 rounded-xl border border-neutral-700 p-3">
          <label className="block text-xs text-neutral-300">
            Titre
            <input
              value={currentPage.title}
              onChange={(event) => updatePage(currentPage.id, (page) => ({ ...page, title: event.target.value }))}
              className="ov-field mt-1 w-full rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-xs text-neutral-300">
            Description
            <input
              value={currentPage.description}
              onChange={(event) => updatePage(currentPage.id, (page) => ({ ...page, description: event.target.value }))}
              className="ov-field mt-1 w-full rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-xs text-neutral-300">
            Contenu de la page
            <textarea
              value={currentPage.markdown}
              onChange={(event) => updatePage(currentPage.id, (page) => ({ ...page, markdown: event.target.value }))}
              rows={10}
              className="ov-field mt-1 w-full rounded-lg px-3 py-2 font-mono text-[11px]"
            />
          </label>
          <details className="rounded-lg border border-neutral-800 p-2">
            <summary className="cursor-pointer text-xs font-medium text-neutral-300">Informations de page</summary>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-neutral-300">
                Adresse de la page
                <input
                  value={currentPage.slug}
                  onChange={(event) => updatePage(currentPage.id, (page) => ({ ...page, slug: event.target.value }))}
                  className="ov-field mt-1 w-full rounded-lg px-3 py-2"
                />
              </label>
              <label className="block text-xs text-neutral-300">
                Rubrique
                <input
                  value={currentPage.category}
                  onChange={(event) => updatePage(currentPage.id, (page) => ({ ...page, category: event.target.value }))}
                  className="ov-field mt-1 w-full rounded-lg px-3 py-2"
                  placeholder="Guides / Basics"
                />
              </label>
              <label className="block text-xs text-neutral-300">
                Étiquettes
                <input
                  value={currentPage.tags.join(', ')}
                  onChange={(event) =>
                    updatePage(currentPage.id, (page) => ({
                      ...page,
                      tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                    }))
                  }
                  className="ov-field mt-1 w-full rounded-lg px-3 py-2"
                  placeholder="guide, installation"
                />
              </label>
              <label className="block text-xs text-neutral-300">
                Modèle de page
                <input
                  value={currentPage.template ?? ''}
                  onChange={(event) =>
                    updatePage(currentPage.id, (page) => ({ ...page, template: event.target.value || undefined }))
                  }
                  className="ov-field mt-1 w-full rounded-lg px-3 py-2"
                />
              </label>
            </div>
          </details>
        </div>
      )}
      {config.assets.length > 0 && (
        <div className="space-y-1 text-[11px] text-neutral-400">
          <p>Ressources importées ({config.assets.length})</p>
          <ul className="space-y-1">
            {config.assets.map((asset) => (
              <li key={asset.path} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{asset.path}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig(
                      (current) => ({
                        ...current,
                        assets: current.assets.filter((candidate) => candidate.path !== asset.path),
                      }),
                      'content',
                    )
                  }
                  className="shrink-0 rounded px-2 py-1 text-red-300 hover:bg-neutral-800"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const structureStep = (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-neutral-400">
        Choisissez comment les visiteurs parcourront vos pages, puis ajustez leur ordre.
      </p>
      <div className="grid gap-2">
        {organizationOptions.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition ${
              config.organization === option.value
                ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-100'
                : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800/60'
            }`}
          >
            <input
              type="radio"
              name="static-web-organization"
              value={option.value}
              checked={config.organization === option.value}
              onChange={() =>
                updateConfig((current) => ({ ...current, organization: option.value }), 'structure')
              }
              className="mt-0.5 accent-indigo-400"
            />
            {option.label}
          </label>
        ))}
      </div>
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-neutral-200">Ordre des pages</h5>
        <ol className="space-y-1.5">
          {config.pages.map((page, index) => (
            <li key={page.id} className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-200">
                {index + 1}. {page.title}
              </span>
              <button
                type="button"
                aria-label={`Monter ${page.title}`}
                disabled={index === 0}
                onClick={() => movePage(index, -1)}
                className="rounded px-2 py-1 text-neutral-300 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Descendre ${page.title}`}
                disabled={index === config.pages.length - 1}
                onClick={() => movePage(index, 1)}
                className="rounded px-2 py-1 text-neutral-300 disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  const appearanceStep = (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold text-neutral-200">Palette de couleurs</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['paper', 'ocean', 'obsidian', 'custom'] as const).map((preset) => (
            <label
              key={preset}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition ${
                config.theme.preset === preset
                  ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-100'
                  : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800/60'
              }`}
            >
              <input
                type="radio"
                name="static-web-theme"
                value={preset}
                checked={config.theme.preset === preset}
                onChange={() =>
                  updateConfig(
                    (current) => ({
                      ...current,
                      theme: preset === 'custom'
                        ? { ...current.theme, preset }
                        : { preset, ...themePresets[preset] },
                    }),
                    'appearance',
                  )
                }
                className="accent-indigo-400"
              />
              {themePresetLabels[preset]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold text-neutral-200">Navigation</legend>
        {!navigationOptions.some((option) => option.value === config.navigation) && (
          <p className="text-xs leading-relaxed text-neutral-400">
            Ce projet utilise une ancienne option. Choisissez Menu latéral ou Menu burger déroulant pour la remplacer.
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {navigationOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition ${
                config.navigation === option.value
                  ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-100'
                  : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800/60'
              }`}
            >
              <input
                type="radio"
                name="static-web-navigation"
                value={option.value}
                checked={config.navigation === option.value}
                onChange={() =>
                  updateConfig((current) => ({ ...current, navigation: option.value }), 'appearance')
                }
                className="accent-indigo-400"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs text-neutral-300">
        Affichage proposé aux visiteurs
        <select
          value={config.displayMode}
          onChange={(event) =>
            updateConfig(
              (current) => ({
                ...current,
                displayMode: event.target.value as StaticWebConfig['displayMode'],
              }),
              'appearance',
            )
          }
          className="ov-field mt-1 w-full rounded-lg px-3 py-2"
        >
          {displayModeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <details className="rounded-lg border border-neutral-800 p-2">
        <summary className="cursor-pointer text-xs font-medium text-neutral-300">Personnaliser les couleurs</summary>
        <fieldset className="mt-3 grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Couleurs du thème</legend>
          {([
            ['primary', 'Principale'],
            ['accent', 'Accentuation'],
            ['background', 'Fond clair'],
            ['text', 'Texte clair'],
            ['darkBackground', 'Fond sombre'],
            ['darkText', 'Texte sombre'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-2 text-xs text-neutral-300">
              {label}
              <input
                type="color"
                value={config.theme[key]}
                onChange={(event) =>
                  updateConfig(
                    (current) => ({
                      ...current,
                      theme: { ...current.theme, [key]: event.target.value, preset: 'custom' },
                    }),
                    'appearance',
                  )
                }
                aria-label={`Couleur ${label.toLowerCase()}`}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
              />
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );

  const generationStep = (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-neutral-400">
        Vérifiez le nom du projet, choisissez le format et générez le rendu configuré prêt à être téléchargé.
      </p>
      {!isStaticWeb && (
        <p className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-300">
          Les fichiers de présentation seront générés dans <code>{resolveUiUxOutputDirectory(spec)}/</code>, séparément du moteur applicatif du template.
        </p>
      )}
      <label className="block text-xs text-neutral-300">
        Nom du projet
        <input
          value={spec.project.name}
          onChange={(event) => {
            markStepInProgress('generation');
            onProjectNameChange(event.target.value);
          }}
          className="ov-field mt-1 w-full rounded-lg px-3 py-2"
          placeholder="Ex. : Mon site"
        />
      </label>
      <label className="block text-xs text-neutral-300">
        Format de téléchargement
        <select
          value={config.exportMode}
          onChange={(event) =>
            updateConfig(
              (current) => ({
                ...current,
                exportMode: event.target.value as StaticWebConfig['exportMode'],
              }),
              'generation',
            )
          }
          className="ov-field mt-1 w-full rounded-lg px-3 py-2"
        >
          <option value="single-html">Un fichier HTML autonome</option>
          <option value="multi-file">Un dossier de site (ZIP)</option>
        </select>
      </label>
      {architecture.isValid ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Configuration prête · {architecture.stats.totalFiles} fichiers
        </p>
      ) : (
        <div role="alert" className="space-y-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
          <p>{architectureErrors.length} problème(s) bloquent la génération.</p>
          <button type="button" onClick={onOpenArchitecture} className="font-semibold underline underline-offset-2">
            Voir le détail
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {config.exportMode === 'single-html' && (
          <button
            type="button"
            onClick={onDownloadHtml}
            disabled={!architecture.isValid || !canGenerate}
            className="ov-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Télécharger le HTML
          </button>
        )}
        <button
          type="button"
          onClick={onDownloadZip}
          disabled={!architecture.isValid || !canGenerate || isDownloading}
          aria-busy={isDownloading}
          className="ov-button-primary inline-flex items-center gap-2 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloading
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Download className="h-4 w-4" aria-hidden="true" />}
          {isDownloading ? 'Génération…' : 'Générer et télécharger'}
        </button>
      </div>
    </div>
  );

  const advancedSettings = (
    <details className="rounded-xl border border-neutral-700 bg-neutral-900/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 sm:p-4">
        <span>
          <span className="block text-sm font-semibold text-neutral-100">Options de composition</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" />
      </summary>
      <div className="space-y-4 border-t border-neutral-700 p-3 sm:p-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold text-neutral-200">Façon de composer les pages</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-700 p-3 text-xs text-neutral-300">
            <input
              type="radio"
              name="static-web-composition"
              value="content-driven"
              checked={config.compositionMode === 'content-driven'}
              onChange={() =>
                updateConfig((current) => ({ ...current, compositionMode: 'content-driven' }), 'structure')
              }
              className="mt-0.5 accent-indigo-400"
            />
            <span><strong className="text-neutral-100">Rédiger avec Markdown</strong><br />Le contenu de chaque page détermine sa présentation.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-700 p-3 text-xs text-neutral-300">
            <input
              type="radio"
              name="static-web-composition"
              value="layout-driven"
              checked={config.compositionMode === 'layout-driven'}
              onChange={() =>
                updateConfig((current) => ({ ...current, compositionMode: 'layout-driven' }), 'structure')
              }
              className="mt-0.5 accent-indigo-400"
            />
            <span><strong className="text-neutral-100">Assembler avec des blocs</strong><br />Ajoutez et réorganisez des sections visuelles avant le contenu Markdown.</span>
          </label>
        </fieldset>
        {config.compositionMode === 'layout-driven' && (
          <div className="space-y-3 rounded-lg border border-neutral-700 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-semibold text-neutral-200">Blocs de la page</h5>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Page sélectionnée : {currentPage?.title ?? 'aucune page'}
                </p>
              </div>
              <div className="flex min-w-0 gap-2">
                <select
                  value={selectedBrick}
                  onChange={(event) => setSelectedBrick(event.target.value)}
                  aria-label="Choisir un bloc"
                  className="ov-field min-w-0 rounded-lg px-2 py-2 text-xs"
                >
                  {STATIC_WEB_BRICKS.map((brick) => (
                    <option key={brick.id} value={brick.id}>{brick.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addBlock}
                  disabled={!currentPage}
                  className="ov-button-secondary shrink-0 px-3 py-2 text-xs disabled:opacity-40"
                >
                  Ajouter
                </button>
              </div>
            </div>
            {currentPage?.blocks.length ? (
              <div className="space-y-2">
                {currentPage.blocks.map((block, index) => {
                  const definition = STATIC_WEB_BRICKS.find((brick) => brick.id === block.brickId);
                  if (!definition) return null;
                  return (
                    <fieldset key={block.id} className="space-y-2 rounded-lg border border-neutral-700 p-2">
                      <legend className="px-1 text-xs font-semibold text-neutral-200">{definition.name}</legend>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            updatePage(
                              currentPage.id,
                              (page) => ({ ...page, blocks: reorder(page.blocks, index, index - 1) }),
                              'structure',
                            )
                          }
                          aria-label={`Monter ${definition.name}`}
                          className="rounded px-2 text-xs text-neutral-300 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === currentPage.blocks.length - 1}
                          onClick={() =>
                            updatePage(
                              currentPage.id,
                              (page) => ({ ...page, blocks: reorder(page.blocks, index, index + 1) }),
                              'structure',
                            )
                          }
                          aria-label={`Descendre ${definition.name}`}
                          className="rounded px-2 text-xs text-neutral-300 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updatePage(
                              currentPage.id,
                              (page) => ({
                                ...page,
                                blocks: page.blocks.filter((candidate) => candidate.id !== block.id),
                              }),
                              'structure',
                            )
                          }
                          aria-label={`Supprimer ${definition.name}`}
                          className="rounded px-2 text-xs text-red-300"
                        >
                          Retirer
                        </button>
                      </div>
                      {definition.properties.map((property) => (
                        <label key={property.key} title={property.description} className="block text-[11px] text-neutral-300">
                          {property.label}
                          {property.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(block.properties[property.key])}
                              onChange={(event) => updateBlockProperty(block.id, property, event.target.checked)}
                              className="ml-2 accent-indigo-400"
                            />
                          ) : property.type === 'list' || property.type === 'markdown' ? (
                            <textarea
                              value={
                                Array.isArray(block.properties[property.key])
                                  ? (block.properties[property.key] as string[]).join('\n')
                                  : String(block.properties[property.key] ?? '')
                              }
                              onChange={(event) => updateBlockProperty(block.id, property, event.target.value)}
                              rows={property.type === 'list' ? 3 : 4}
                              className="ov-field mt-1 w-full rounded-lg px-2 py-1.5 font-mono text-[11px]"
                            />
                          ) : property.type === 'select' && property.options?.length ? (
                            <select
                              value={String(block.properties[property.key] ?? '')}
                              onChange={(event) => updateBlockProperty(block.id, property, event.target.value)}
                              className="ov-field mt-1 w-full rounded-lg px-2 py-1.5"
                            >
                              {property.options.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          ) : (
                            <input
                              type={propertyInputTypeForEditor(property.type)}
                              value={String(block.properties[property.key] ?? '')}
                              onChange={(event) => updateBlockProperty(block.id, property, event.target.value)}
                              className="ov-field mt-1 w-full rounded-lg px-2 py-1.5"
                            />
                          )}
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Aucun bloc ajouté. Le site reste générable sans bloc.</p>
            )}
          </div>
        )}
      </div>
    </details>
  );

  const themeChoice = (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-700 p-1" role="group" aria-label="Mode de couleur de l’aperçu">
      {(['light', 'dark'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={previewTheme === mode}
          onClick={() => setPreviewTheme(mode)}
          className={`rounded-md px-2.5 py-1.5 text-xs ${
            previewTheme === mode ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          {mode === 'light' ? 'Clair' : 'Sombre'}
        </button>
      ))}
    </div>
  );

  const viewportChoice = (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-700 p-1" role="group" aria-label="Largeur de prévisualisation">
      {(['desktop', 'tablet', 'mobile'] as const).map((width) => (
        <button
          key={width}
          type="button"
          aria-pressed={previewWidth === width}
          onClick={() => setPreviewWidth(width)}
          className={`rounded-md px-2.5 py-1.5 text-xs capitalize ${
            previewWidth === width ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          {width === 'desktop' ? 'Desktop' : width === 'tablet' ? 'Tablette' : 'Mobile'}
        </button>
      ))}
    </div>
  );

  const simulatedWidth = previewWidths[previewWidth];
  const iframeWidth = typeof simulatedWidth === 'number' ? `${simulatedWidth}px` : simulatedWidth;

  return (
    <section className="mt-5 border-t border-neutral-700 pt-5" aria-labelledby="static-web-config-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
            {isStaticWeb ? 'Static Web' : 'Personnalisation UI/UX'}
          </p>
          <h3 id="static-web-config-heading" className="mt-1 text-base font-semibold text-neutral-100">
            {isStaticWeb ? 'Créez votre site en cinq étapes' : 'Personnalisez le rendu et le contenu du template'}
          </h3>
          <p className="mt-1 text-xs text-neutral-400">{configuredCount} étape(s) configurée(s) sur 5</p>
        </div>
      </div>

      <div
        className="sticky top-16 z-30 mb-4 flex w-fit max-w-full gap-1 rounded-lg border border-neutral-700 bg-neutral-900/95 p-1 shadow-xl backdrop-blur xl:hidden"
        role="tablist"
        aria-label="Panneau de configuration et d’aperçu"
      >
        {(['configuration', 'preview'] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            id={`static-web-${panel}-tab`}
            role="tab"
            aria-controls={`static-web-${panel}-panel`}
            aria-selected={mobilePanel === panel}
            onClick={() => selectMobilePanel(panel)}
            className={`rounded-md px-3 py-2 text-xs ${
              mobilePanel === panel ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-300'
            }`}
          >
            {panel === 'configuration' ? 'Configuration' : 'Aperçu'}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(19rem,0.65fr)_minmax(0,1.85fr)] 2xl:grid-cols-[minmax(21rem,0.7fr)_minmax(0,1.9fr)]">
        <div
          id="static-web-configuration-panel"
          role="tabpanel"
          aria-labelledby="static-web-configuration-tab"
          className={`${mobilePanel === 'configuration' ? 'block' : 'hidden'} min-w-0 scroll-mt-28 space-y-3 xl:block`}
        >
          <ol className="space-y-2.5">
            {renderStep(
              'type',
              '01',
              selectedTemplate ?? 'Choisissez un modèle de départ',
              isStaticWeb ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-neutral-400">
                    Choisissez le point de départ qui correspond le mieux à votre site. Vous pourrez modifier son contenu ensuite.
                  </p>
                  <div className="grid gap-2">
                    {templateOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={spec.template === option.value}
                        onClick={() => handleTemplateSelect(option.value)}
                        className={`rounded-lg border p-3 text-left transition ${
                          spec.template === option.value
                            ? 'border-indigo-400/60 bg-indigo-500/10'
                            : 'border-neutral-700 hover:bg-neutral-800/60'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2 text-xs font-semibold text-neutral-100">
                          {option.label}
                          {spec.template === option.value && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                        </span>
                        <span className="mt-1 block text-[11px] text-neutral-400">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-300">
                  Le modèle du projet est conservé. Les contrôles et la prévisualisation s’appliquent à son rendu UI/UX, sans modifier ses réglages techniques.
                </p>
              ),
            )}
            {renderStep(
              'content',
              '02',
              `${config.pages.length} page(s) · ${config.assets.length} ressource(s)`,
              contentStep,
            )}
            {renderStep(
              'structure',
              '03',
              `${organizationLabel} · ${pageSummary || 'Aucune page'}`,
              <>
                {structureStep}
                {advancedSettings}
              </>,
            )}
            {renderStep(
              'appearance',
              '04',
              `${themePresetLabels[config.theme.preset]} · ${navigationLabel} · ${displayModeLabel}`,
              appearanceStep,
            )}
            {renderStep(
              'generation',
              '05',
              `${spec.project.name || 'Projet sans nom'} · ${config.exportMode === 'single-html' ? 'HTML autonome' : 'Site ZIP'}`,
              generationStep,
            )}
          </ol>
        </div>

        <aside
          id="static-web-preview-panel"
          role="tabpanel"
          aria-labelledby="static-web-preview-tab"
          className={`${mobilePanel === 'preview' ? 'block' : 'hidden'} min-w-0 scroll-mt-28 xl:sticky xl:top-20 xl:block xl:self-start`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-neutral-100">Aperçu en direct</h4>
              <p className="text-[11px] text-neutral-400">
                Largeur simulée : {previewWidth === 'desktop' ? 'Desktop' : `${simulatedWidth}px`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {themeChoice}
              {viewportChoice}
            </div>
          </div>
          {preview.error ? (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
              {preview.error}
            </p>
          ) : (
            <div className="min-w-0 overflow-auto rounded-xl border border-neutral-700 bg-neutral-950 p-2">
              <iframe
                title={`Aperçu du rendu ${isStaticWeb ? 'Static Web' : 'UI/UX'}`}
                sandbox="allow-scripts"
                srcDoc={preview.html}
                style={{
                  width: iframeWidth,
                  maxWidth: 'none',
                  height: 'min(78vh, 58rem)',
                  minHeight: '32rem',
                }}
                className="rounded-lg bg-white"
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
