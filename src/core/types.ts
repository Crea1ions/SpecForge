/**
 * SpecForge - Project Architecture & Scaffolding Platform
 * Core Domain Type Definitions
 * 
 * Independent of React, DOM, UI components, or any specific presentation framework.
 */

export type ProjectType =
  | 'fullstack'
  | 'desktop'
  | 'backend-only'
  | 'frontend-only'
  | 'cli'
  | 'mobile'
  | 'static-site';

export type TechnicalProfile =
  | 'rust'
  | 'python'
  | 'typescript'
  | 'go'
  | 'static-web';

export type ApplicationTemplate =
  | 'web-frontend'
  | 'web-app'
  | 'web-platform'
  | 'ecommerce'
  | 'api-service'
  | 'desktop'
  | 'mobile'
  | 'static-documentation'
  | 'static-website'
  | 'static-landing-page';

export interface ProjectInfo {
  name: string;
  slug: string;
  description: string;
  type: ProjectType;
  version: string;
  author: string;
  license: string;
  identifier?: string;
}

export interface BackendConfig {
  enabled: boolean;
  language: 'rust' | 'python' | 'typescript' | 'go';
  framework: 'axum' | 'actix-web' | 'fastapi' | 'express' | 'net/http';
  port: number;
  logging: boolean;
  cors: boolean;
}

export interface FrontendConfig {
  enabled: boolean;
  framework: 'react' | 'vue' | 'askama' | 'dioxus' | 'static-html' | 'none';
  bundler: 'vite' | 'none';
  language: 'typescript' | 'javascript' | 'rust';
  styling: 'tailwind' | 'css';
  tauri: boolean;
}

export interface DatabaseConfig {
  enabled: boolean;
  type: 'sqlite' | 'postgresql' | 'none';
  orm: 'sqlx' | 'diesel' | 'prisma';
  migrations: boolean;
  pooling: boolean;
}

export interface ApiConfig {
  style: 'rest' | 'websocket' | 'none';
  auth: boolean;
  openapi: boolean;
}

export interface AuthConfig {
  enabled: boolean;
  provider: 'jwt' | 'none';
  sessionStore: boolean;
}

export interface InfraConfig {
  docker: boolean;
  compose: boolean;
  systemd: boolean;
}

export interface QualityConfig {
  tests: boolean;
  lint: boolean;
  ci: boolean;
  gitHooks: boolean;
}

export interface DocsConfig {
  readme: boolean;
  workStructure: boolean;
}

export type StaticWebCompositionMode = 'content-driven' | 'layout-driven';
export type StaticWebOrganization = 'single-page' | 'multi-page' | 'documentation';
export type StaticWebNavigation = 'sidebar' | 'topbar' | 'combined' | 'burger';
export type StaticWebDisplayMode = 'light' | 'dark' | 'system' | 'toggle';
export type StaticWebExportMode = 'single-html' | 'multi-file';

export interface StaticWebPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  category: string;
  tags: string[];
  template?: string;
  sourcePath?: string;
  markdown: string;
  blocks: StaticWebBlock[];
}

export interface StaticWebBlock {
  id: string;
  brickId: string;
  properties: Record<string, string | number | boolean | string[]>;
}

export interface StaticWebAsset {
  path: string;
  mediaType: string;
  content: string;
  encoding: 'base64';
}

export interface StaticWebConfig {
  compositionMode: StaticWebCompositionMode;
  organization: StaticWebOrganization;
  navigation: StaticWebNavigation;
  displayMode: StaticWebDisplayMode;
  exportMode: StaticWebExportMode;
  contentInstruction?: string;
  theme: {
    preset: 'paper' | 'ocean' | 'obsidian' | 'custom';
    primary: string;
    accent: string;
    background: string;
    text: string;
    darkBackground: string;
    darkText: string;
  };
  pages: StaticWebPage[];
  assets: StaticWebAsset[];
}

/**
 * UI/UX des templates applicatifs (hors Static Web).
 *
 * Configuration visuelle commune — pages, blocs, thème, navigation, assets —
 * alimentant les implémentations natives de chaque template (Askama, React,
 * Dioxus). Type autonome : il ne s'agit plus d'un alias de `StaticWebConfig`.
 * La structure des pages/blocs/assets reste compatible avec l'éditeur partagé.
 */
export interface ProjectUiUxBlock {
  id: string;
  brickId: string;
  properties: Record<string, string | number | boolean | string[]>;
}

export interface ProjectUiUxPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  category: string;
  tags: string[];
  template?: string;
  sourcePath?: string;
  markdown: string;
  blocks: ProjectUiUxBlock[];
}

export interface ProjectUiUxAsset {
  path: string;
  mediaType: string;
  content: string;
  encoding: 'base64';
}

export interface ProjectUiUxConfig {
  compositionMode: StaticWebCompositionMode;
  organization: StaticWebOrganization;
  navigation: StaticWebNavigation;
  /**
   * Champ hérité, ignoré par les templates applicatifs : leurs interfaces
   * générées embarquent par défaut un interrupteur clair/sombre fonctionnel
   * (les deux palettes sont émises). Conservé requis pour compatibilité de
   * la spec et la réutilisation du renderer Static Web (docs-site).
   */
  displayMode: StaticWebDisplayMode;
  exportMode: StaticWebExportMode;
  contentInstruction?: string;
  /**
   * Templates API-only uniquement : génère un site documentaire autonome dans
   * `docs-site/`. Désactivé par défaut et sans effet sur les templates dotés
   * d'une interface native (combinaison refusée par le validateur).
   */
  docsSite: boolean;
  theme: StaticWebConfig['theme'];
  pages: ProjectUiUxPage[];
  assets: ProjectUiUxAsset[];
}

/** Cible de rendu native d'un template applicatif. */
export type UiUxRenderTarget = 'askama' | 'react' | 'dioxus';

export type ProjectUiUxBrickPropertyType = StaticWebBrickPropertyType;

export interface ProjectUiUxBrickPropertyDefinition {
  key: string;
  label: string;
  type: ProjectUiUxBrickPropertyType;
  defaultValue: string | number | boolean | string[];
  required?: boolean;
  options?: string[];
  description?: string;
}

/**
 * Définition d'une brick UI/UX : contrat sémantique (identifiant, catégorie,
 * propriétés, variantes, compatibilités) sans génération liée à un langage.
 */
export interface ProjectUiUxBrickDefinition {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'content' | 'marketing';
  compatibleProfiles: TechnicalProfile[];
  compatibleTemplates?: ApplicationTemplate[];
  properties: ProjectUiUxBrickPropertyDefinition[];
}

export interface ProjectUiUxBlockRenderContext {
  spec: ProjectSpecification;
  config: ProjectUiUxConfig;
  page: ProjectUiUxPage;
}

/**
 * Implémentation native d'une brick UI/UX pour une cible donnée. Une même
 * définition peut avoir plusieurs implémentations (Askama, React, Dioxus).
 * `render` produit le markup natif embarqué dans le scaffold (template Askama,
 * JSX, RSX) ; `renderPreview` produit le HTML utilisé par l'aperçu de l'éditeur.
 */
export interface ProjectUiUxBrickImplementation {
  brickId: string;
  target: UiUxRenderTarget;
  render: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) => string;
  renderPreview: (block: ProjectUiUxBlock, ctx: ProjectUiUxBlockRenderContext) => string;
}

/**
 * Intégration d'un template : déclare la cible de rendu native utilisée pour
 * alimenter son interface, ou l'absence d'interface (API-only).
 */
export interface ProjectUiUxTemplateIntegration {
  profile: TechnicalProfile;
  template: ApplicationTemplate;
  target: UiUxRenderTarget | null;
  hasNativeUi: boolean;
  /**
   * Quand false, l'interface native est pilotée par les données métier (ex.
   * vitrine e-commerce) : seul le thème visuel est appliqué, les pages/blocs de
   * contenu ne s'y appliquent pas.
   */
  supportsContentPages?: boolean;
}

export type StaticWebBrickPropertyType =
  | 'text'
  | 'markdown'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'list';

export interface StaticWebBrickPropertyDefinition {
  key: string;
  label: string;
  type: StaticWebBrickPropertyType;
  defaultValue: string | number | boolean | string[];
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface StaticWebBrickDefinition {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'content' | 'marketing';
  compatibleProfiles: TechnicalProfile[];
  compatibleTemplates?: ApplicationTemplate[];
  properties: StaticWebBrickPropertyDefinition[];
}

export interface ProjectSpecification {
  specVersion: string;
  profile: TechnicalProfile;
  template: ApplicationTemplate;
  project: ProjectInfo;
  backend: BackendConfig;
  frontend: FrontendConfig;
  database: DatabaseConfig;
  api: ApiConfig;
  authentication: AuthConfig;
  infrastructure: InfraConfig;
  quality: QualityConfig;
  documentation: DocsConfig;
  staticWeb?: StaticWebConfig;
  uiUx?: ProjectUiUxConfig;
}

export type BrickCategory =
  | 'backend'
  | 'frontend'
  | 'database'
  | 'api'
  | 'authentication'
  | 'infrastructure'
  | 'quality'
  | 'documentation';

export interface BrickOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default: unknown;
  options?: { value: string; label: string }[];
  description: string;
}

export interface GenerationContext {
  spec: ProjectSpecification;
  activeBricks: BrickDefinition[];
  decisions: ArchitecturalDecision[];
}

export interface BrickDefinition {
  id: string;
  name: string;
  category: BrickCategory;
  version: string;
  description: string;
  iconName: string;
  provides: string[];
  requires: string[];
  compatibleWith: string[];
  conflictsWith: string[];
  options: BrickOption[];
  templateFiles: string[];
  tags: string[];
  generateFiles?: (ctx: GenerationContext) => GeneratedFile[];
  generateDecisions?: (ctx: GenerationContext) => ArchitecturalDecision[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  source: 'compatibility' | 'dependency' | 'configuration';
  fixSuggestion?: string;
  affectedBricks?: string[];
}

export interface ArchitecturalDecision {
  id: string;
  title: string;
  status: 'Accepted' | 'Proposed' | 'Superseded';
  context: string;
  decision: string;
  consequences: string[];
  generatingBrick: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language:
    | 'rust'
    | 'python'
    | 'go'
    | 'typescript'
    | 'javascript'
    | 'json'
    | 'yaml'
    | 'toml'
    | 'markdown'
    | 'dockerfile'
    | 'bash'
    | 'css'
    | 'html'
    | 'sql'
    | 'binary';
  size: number;
  brickId: string;
  brickName: string;
  brickVersion: string;
  reason: string;
  decisionRef?: string;
  /** Encodage de `content` : utf8 par défaut, base64 pour un fichier binaire (ex. PNG). */
  encoding?: 'utf8' | 'base64';
}

export interface ArchitectureNode {
  id: string;
  name: string;
  category: BrickCategory;
  layer: 'client' | 'gateway' | 'app' | 'data' | 'ops';
  brickId?: string;
  description: string;
  technologies: string[];
  status: 'active' | 'optional';
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
  protocol?: string;
}

export interface ResolvedArchitecture {
  isValid: boolean;
  activeBricks: BrickDefinition[];
  issues: ValidationIssue[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  decisions: ArchitecturalDecision[];
  stats: {
    totalFiles: number;
    totalSizeKb: number;
    brickCount: number;
    estimatedSetupTimeMin: number;
  };
}
