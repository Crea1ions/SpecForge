/**
 * SpecForge - Project Architecture & Scaffolding Platform
 * Core Domain Type Definitions
 * 
 * Independent of React, DOM, UI components, or any specific presentation framework.
 */

export type ProjectType = 'fullstack' | 'desktop' | 'backend-only' | 'frontend-only' | 'cli';

export type TechnicalProfile =
  | 'rust'
  | 'python'
  | 'typescript'
  | 'go';

export type ApplicationTemplate =
  | 'web-frontend'
  | 'web-app'
  | 'web-platform'
  | 'api-service'
  | 'desktop'
  | 'mobile';

export interface ProjectInfo {
  name: string;
  slug: string;
  description: string;
  type: ProjectType;
  version: string;
  author: string;
  license: string;
}

export interface BackendConfig {
  enabled: boolean;
  language: 'rust' | 'python' | 'typescript' | 'go';
  framework: 'axum' | 'actix-web' | 'fastapi' | 'express';
  port: number;
  logging: boolean;
  cors: boolean;
}

export interface FrontendConfig {
  enabled: boolean;
  framework: 'react' | 'vue' | 'askama' | 'none';
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
