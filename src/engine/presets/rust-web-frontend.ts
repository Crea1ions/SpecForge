import { ArchitecturePreset } from './types';

export const rustWebFrontendPreset: ArchitecturePreset = {
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
