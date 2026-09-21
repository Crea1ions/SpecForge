import { ArchitecturePreset } from './types';

export const rustBackendOnlyPreset: ArchitecturePreset = {
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
