import { ArchitecturePreset } from './types';

export const rustTauriReactPreset: ArchitecturePreset = {
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
      gitHooks: false,
    },
    documentation: {
      readme: true,
      workStructure: true,
    },
  },
};
