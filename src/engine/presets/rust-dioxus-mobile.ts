import { ArchitecturePreset } from './types';

export const rustDioxusMobilePreset: ArchitecturePreset = {
  id: 'rust-dioxus-mobile',
  name: 'Rust Dioxus Mobile',
  tagline: 'Application Mobile Cross-Platform',
  description: 'Application mobile cross-platform (Android & iOS) en Rust avec Dioxus.',
  badge: 'Rust Mobile',
  category: 'mobile',
  spec: {
    profile: 'rust',
    template: 'mobile',
    specVersion: '1.0.0',
    project: {
      name: 'RustMobileApp',
      slug: 'rust-mobile-app',
      description: 'Application mobile cross-platform en Rust avec Dioxus.',
      type: 'mobile',
      version: '0.1.0',
      author: 'SpecForge Builder',
      license: 'MIT',
      identifier: 'com.acme.rustmobileapp',
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
      framework: 'dioxus',
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
