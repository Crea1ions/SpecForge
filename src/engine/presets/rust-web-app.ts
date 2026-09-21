import { ArchitecturePreset } from './types';

export const rustWebAppPreset: ArchitecturePreset = {
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
