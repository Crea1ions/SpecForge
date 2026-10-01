import { ArchitecturePreset } from './types';

export const typescriptBackendOnlyPreset: ArchitecturePreset = {
  id: 'typescript-backend-only',
  name: 'TypeScript Backend Only',
  tagline: 'API Node.js typée',
  description: 'Microservice API en TypeScript avec Express, sans couche frontend. Démarrage rapide, typage strict et écosystème npm.',
  badge: 'API / Microservice',
  category: 'backend',
  spec: {
    profile: 'typescript',
    template: 'api-service',
    specVersion: '1.0.0',
    project: {
      name: 'TsMicro',
      slug: 'ts-micro',
      description: 'Microservice API REST en TypeScript Express.',
      type: 'backend-only',
      version: '0.1.0',
      author: 'SpecForge Builder',
      license: 'Apache-2.0',
    },
    backend: {
      enabled: true,
      language: 'typescript',
      framework: 'express',
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
      enabled: false,
      type: 'sqlite',
      orm: 'prisma',
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
      tests: false,
      lint: false,
      ci: false,
      gitHooks: false,
    },
    documentation: {
      readme: true,
      workStructure: false,
    },
  },
};