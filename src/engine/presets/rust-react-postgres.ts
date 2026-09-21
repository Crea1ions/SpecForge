import { ArchitecturePreset } from './types';

export const rustReactPostgresPreset: ArchitecturePreset = {
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
