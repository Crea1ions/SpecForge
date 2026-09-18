/**
 * SpecForge - Curated Architecture Presets
 * Pre-configured targets defined in Section 18 of the specification
 */

import { ProjectSpecification } from '../core';

export interface ArchitecturePreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  category: 'fullstack' | 'desktop' | 'backend' | 'frontend';
  spec: ProjectSpecification;
}

export const findPreset = (
  profile: ProjectSpecification['profile'],
  template: ProjectSpecification['template'],
): ArchitecturePreset | undefined =>
  PRESETS.find(
    (preset) =>
      preset.spec.profile === profile &&
      preset.spec.template === template,
  );

export const PRESETS: ArchitecturePreset[] = [
{
  id: 'rust-web-app',
  name: 'Rust Web App',
  tagline: 'Application Web Complète',
  description: 'Application web complète en Rust avec Axum, Askama, CSS, JavaScript vanilla et SQLite.',
  badge: 'Rust Web',
  category: 'fullstack',
  spec: {
    profile: 'rust',
    template: 'web-app',
    specVersion: '1.0.0',
    project: {
      name: 'RustWebApp',
      slug: 'rust-web-app',
      description: 'Application web complète en Rust avec Askama et SQLite.',
      type: 'fullstack',
      version: '0.1.0',
      author: 'SpecForge Builder',
      license: 'MIT',
    },
    backend: {
      enabled: true,
      language: 'rust',
      framework: 'axum',
      port: 8080,
      logging: true,
      cors: true,
    },
    frontend: {
      enabled: true,
      framework: 'askama',
      bundler: 'none',
      language: 'rust',
      styling: 'css',
      tauri: false,
    },
    database: {
      enabled: true,
      type: 'sqlite',
      orm: 'sqlx',
      migrations: true,
      pooling: true,
    },
    api: {
      style: 'rest',
      auth: true,
      openapi: true,
      rateLimiting: false,
    },
    authentication: {
      enabled: true,
      provider: 'jwt',
      sessionStore: false,
    },
    infrastructure: {
      docker: true,
      compose: false,
      systemd: true,
      vpsScript: false,
      nginx: false,
    },
    quality: {
      tests: true,
      lint: true,
      ci: true,
      gitHooks: true,
    },
    documentation: {
      readme: true,
      workStructure: true,
    },
  },
},
  {
    id: 'rust-react-postgres',
    name: 'Rust + React + PostgreSQL',
    tagline: 'Fullstack Cloud Scalable',
    description: 'Pile haute charge prête pour la production avec base PostgreSQL conteneurisée sous Docker Compose.',
    badge: 'Enterprise',
    category: 'fullstack',
    spec: {
      profile: 'rust',
      template: 'web-platform',
      specVersion: '1.0.0',
      project: {
        name: 'Enterprise Hub',
        slug: 'enterprise-hub',
        description: 'Système cloud distribué avec Rust Axum, PostgreSQL et React.',
        type: 'fullstack',
        version: '0.1.0',
        author: 'SpecForge Builder',
        license: 'MIT',
      },
      backend: {
        enabled: true,
        language: 'rust',
        framework: 'axum',
        port: 8080,
        logging: true,
        cors: true,
      },
      frontend: {
        enabled: true,
        framework: 'react',
        bundler: 'vite',
        language: 'typescript',
        styling: 'tailwind',
        tauri: false,
      },
      database: {
        enabled: true,
        type: 'postgresql',
        orm: 'sqlx',
        migrations: true,
        pooling: true,
      },
      api: {
        style: 'rest',
        auth: true,
        openapi: true,
        rateLimiting: true,
      },
      authentication: {
        enabled: true,
        provider: 'jwt',
        sessionStore: false,
      },
      infrastructure: {
        docker: true,
        compose: true,
        systemd: false,
        vpsScript: false,
        nginx: true,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: true,
      },
      documentation: {
        readme: true,
        workStructure: true,
      },
    },
  },
  {
    id: 'rust-tauri-react',
    name: 'Rust + Tauri + React',
    tagline: 'Application Bureau Légère',
    description: 'Application de bureau native pour macOS, Windows et Linux avec backend Rust natif, interface web React et SQLite local.',
    badge: 'Desktop',
    category: 'desktop',
    spec: {
      profile: 'rust',
      template: 'desktop',
      specVersion: '1.0.0',
      project: {
        name: 'OmniDesktop',
        slug: 'omni-desktop',
        description: 'Logiciel de bureau natif fluide avec Tauri et SQLite.',
        type: 'desktop',
        version: '0.1.0',
        author: 'SpecForge Builder',
        license: 'MIT',
      },
      backend: {
        enabled: false,
        language: 'rust',
        framework: 'axum',
        port: 8080,
        logging: true,
        cors: false,
      },
      frontend: {
        enabled: true,
        framework: 'react',
        bundler: 'vite',
        language: 'typescript',
        styling: 'tailwind',
        tauri: true,
      },
      database: {
        enabled: true,
        type: 'sqlite',
        orm: 'sqlx',
        migrations: true,
        pooling: false,
      },
      api: {
        style: 'none',
        auth: false,
        openapi: false,
        rateLimiting: false,
      },
      authentication: {
        enabled: false,
        provider: 'none',
        sessionStore: false,
      },
      infrastructure: {
        docker: false,
        compose: false,
        systemd: false,
        vpsScript: false,
        nginx: false,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: false,
      },
      documentation: {
        readme: true,
        workStructure: true,
      },
    },
  },
  {
    id: 'rust-backend-only',
    name: 'Rust Backend Only',
    tagline: 'Microservice Haute Performance',
    description: 'Microservice API REST pur en Rust sans couche frontend. Temps de réponse en microsecondes et empreinte mémoire négligeable.',
    badge: 'API / Microservice',
    category: 'backend',
    spec: {
      profile: 'rust',
      template: 'api-service',
      specVersion: '1.0.0',
      project: {
        name: 'FastMicro',
        slug: 'fast-micro',
        description: 'Microservice API REST ultra-rapide en Rust Axum.',
        type: 'backend-only',
        version: '0.1.0',
        author: 'SpecForge Builder',
        license: 'Apache-2.0',
      },
      backend: {
        enabled: true,
        language: 'rust',
        framework: 'axum',
        port: 8080,
        logging: true,
        cors: true,
      },
      frontend: {
        enabled: false,
        framework: 'none',
        bundler: 'vite',
        language: 'typescript',
        styling: 'tailwind',
        tauri: false,
      },
      database: {
        enabled: true,
        type: 'sqlite',
        orm: 'sqlx',
        migrations: true,
        pooling: true,
      },
      api: {
        style: 'rest',
        auth: true,
        openapi: true,
        rateLimiting: true,
      },
      authentication: {
        enabled: true,
        provider: 'jwt',
        sessionStore: false,
      },
      infrastructure: {
        docker: true,
        compose: false,
        systemd: true,
        vpsScript: true,
        nginx: false,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: true,
      },
      documentation: {
        readme: true,
        workStructure: true,
      },
    },
  },
  {
    id: 'react-frontend-only',
    name: 'React Frontend Only',
    tagline: 'Application SPA Client-Side',
    description: 'Application frontend autonome sous React 19 et Vite avec Tailwind CSS, prête à consommer des APIs externes ou un BaaS.',
    badge: 'Client SPA',
    category: 'frontend',
    spec: {
      profile: 'typescript',
      template: 'web-frontend',
      specVersion: '1.0.0',
      project: {
        name: 'GlassApp',
        slug: 'glass-app',
        description: 'Single-Page Application réactive avec React 19 et Tailwind CSS.',
        type: 'frontend-only',
        version: '0.1.0',
        author: 'SpecForge Builder',
        license: 'MIT',
      },
      backend: {
        enabled: false,
        language: 'rust',
        framework: 'axum',
        port: 8080,
        logging: false,
        cors: false,
      },
      frontend: {
        enabled: true,
        framework: 'react',
        bundler: 'vite',
        language: 'typescript',
        styling: 'tailwind',
        tauri: false,
      },
      database: {
        enabled: false,
        type: 'none',
        orm: 'sqlx',
        migrations: false,
        pooling: false,
      },
      api: {
        style: 'none',
        auth: false,
        openapi: false,
        rateLimiting: false,
      },
      authentication: {
        enabled: false,
        provider: 'none',
        sessionStore: false,
      },
      infrastructure: {
        docker: true,
        compose: false,
        systemd: false,
        vpsScript: false,
        nginx: true,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: true,
      },
      documentation: {
        readme: true,
        workStructure: true,
      },
    },
  },

  {
    id: 'rust-web-frontend',
    name: 'Rust Web Frontend',
    tagline: 'Application Web Server-Rendered',
    description: 'Application web server-rendered en Rust avec Axum, Askama, CSS et JavaScript vanilla.',
    badge: 'Rust Web',
    category: 'frontend',
    spec: {
      profile: 'rust',
      template: 'web-frontend',
      specVersion: '1.0.0',
      project: {
        name: 'RustWebApp',
        slug: 'rust-web-app',
        description: 'Application web server-rendered en Rust avec Askama.',
        type: 'frontend-only',
        version: '0.1.0',
        author: 'SpecForge Builder',
        license: 'MIT',
      },
      backend: {
        enabled: false,
        language: 'rust',
        framework: 'axum',
        port: 8080,
        logging: true,
        cors: false,
      },
      frontend: {
        enabled: true,
        framework: 'askama',
        bundler: 'none',
        language: 'rust',
        styling: 'css',
        tauri: false,
      },
      database: {
        enabled: false,
        type: 'none',
        orm: 'sqlx',
        migrations: false,
        pooling: false,
      },
      api: {
        style: 'none',
        auth: false,
        openapi: false,
        rateLimiting: false,
      },
      authentication: {
        enabled: false,
        provider: 'none',
        sessionStore: false,
      },
      infrastructure: {
        docker: false,
        compose: false,
        systemd: false,
        vpsScript: false,
        nginx: false,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: true,
      },
      documentation: {
        readme: true,
        workStructure: true,
      },
    },
  },
];
