import { ArchitecturePreset } from './types';

export const reactFrontendOnlyPreset: ArchitecturePreset = {
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
};
