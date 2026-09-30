import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 11. Docker Infrastructure Brick
export const dockerInfraBrick: BrickDefinition = {
  id: 'docker-infra',
  name: 'Docker & Multi-Stage Compose',
  category: 'infrastructure',
  version: '1.5.0',
  description: 'Conteneurisation reproductible avec builds multi-étapes légers (Alpine Linux).',
  iconName: 'Box',
  provides: ['container_image', 'compose_orchestration'],
  requires: ['backend_runtime'],
  applies: [{ infrastructure: { docker: true } }],
  compatibleWith: ['rust-backend', 'python-backend', 'react-vite', 'postgres-storage'],
  conflictsWith: ['tauri-desktop'],
  options: [],
  templateFiles: ['Dockerfile', 'docker-compose.yml'],
  tags: ['docker', 'compose', 'containers'],

  generateDecisions: () => [
    {
      id: 'ADR-005',
      title: 'Conteneurisation multi-étapes via Docker',
      status: 'Accepted',
      context: 'Garantir la parité stricte entre environnement local et production.',
      decision: 'Utilisation d\'une image Alpine minimale avec compilation multi-étapes.',
      consequences: ['Image de production allégée et isolée.'],
      generatingBrick: 'docker-infra',
    },
  ],

generateFiles: (ctx) => {
  const { spec } = ctx;
  const files: GeneratedFile[] = [];

    // Détection des bricks actifs pour adapter le Dockerfile
    const activeIds = ctx.activeBricks.map((b) => b.id);
    const hasRustWebApp = activeIds.includes('rust-web-app');
    const hasRustBackend = activeIds.includes('rust-backend');
    const hasReactVite = activeIds.includes('react-vite');
    const hasPythonBackend = activeIds.includes('python-backend');

    const isRustProject = hasRustWebApp || hasRustBackend || (!hasPythonBackend && !hasReactVite && spec.backend.language === 'rust');
    const needsTemplates = hasRustWebApp;
    const needsStatic = hasRustWebApp;

    const copyTemplatesLine = needsTemplates ? 'COPY templates ./templates\n' : '';

    // Étape frontend (react-vite) : build Vite puis copie du dist dans /app/static
    const frontendBuilderStage = hasReactVite
      ? `# --- Étape 1 : build du frontend React/Vite ---
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

`
      : '';

    const frontendCopyLine = hasReactVite
      ? `COPY --from=frontend-builder /frontend/dist /app/static\n`
      : (needsStatic ? 'COPY static ./static\n' : '');

    const dockerfile = isRustProject
      ? `${frontendBuilderStage}# --- Étape ${hasReactVite ? '2' : '1'} : build du backend Rust ---
FROM rust:1.94-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
${copyTemplatesLine}COPY migrations ./migrations
RUN cargo build --release --locked

# --- Étape finale ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/${spec.project.slug} /app/server
${frontendCopyLine}ENV PORT=${spec.backend.port}
EXPOSE ${spec.backend.port}
CMD ["/app/server"]
`
      : `# Dockerfile généré par SpecForge (backend non-Rust — à adapter)
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
ENV PORT=${spec.backend.port}
EXPOSE ${spec.backend.port}
# TODO: adapter le build pour le backend ${spec.backend.language}
CMD ["sh", "-c", "echo 'Dockerfile à compléter pour ${spec.backend.language}' && sleep infinity"]
`;

      files.push(
      makeFile(
        'Dockerfile',
        dockerfile,
        'dockerfile',
        'docker-infra',
        'Docker & Multi-Stage Compose',
        '1.5.0',
        'Définition de conteneur multi-étapes légère et sécurisée (Alpine Linux).',
        'ADR-005'
      )
    );

    // .dockerignore pour exclure les artefacts lourds du contexte de build
    files.push(
      makeFile(
        '.dockerignore',
        `target/
frontend/node_modules/
frontend/dist/
.git/
.gitignore
*.log
.env
.env.*
work/
docs/
`,
        'dockerfile',
        'docker-infra',
        'Docker & Multi-Stage Compose',
        '1.5.0',
        'Exclusions du contexte de build Docker (artefacts, dépendances, secrets).',
        'ADR-005'
      )
    );

    if (spec.infrastructure.compose) {
      const compose = `services:
  app:
    build: .
    ports:
      - "${spec.backend.port}:${spec.backend.port}"
    environment:
      - PORT=${spec.backend.port}
      ${spec.database.enabled && spec.database.type === 'postgresql' ? '- DATABASE_URL=postgres://postgres:postgres@db:5432/app' : ''}
    ${spec.database.enabled && spec.database.type === 'postgresql' ? 'depends_on:\n      db:\n        condition: service_healthy' : ''}
    restart: unless-stopped

${
  spec.database.enabled && spec.database.type === 'postgresql'
    ? `  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`
    : ''
}
`;
      files.push(
        makeFile(
          'docker-compose.yml',
          compose,
          'yaml',
          'docker-infra',
          'Docker & Multi-Stage Compose',
          '1.5.0',
          'Orchestration des conteneurs applicatif et persistance en local.'
        )
      );
    }

    return files;
  },
};
