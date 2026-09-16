/**
 * SpecForge Core - Architecture Resolver
 * 
 * Takes a ProjectSpecification, determines active bricks, resolves dependencies,
 * validates constraints, and constructs the architectural blueprint (nodes, edges, ADRs).
 * 
 * Free of UI and framework dependencies.
 */

import {
  ProjectSpecification,
  ResolvedArchitecture,
  BrickDefinition,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitecturalDecision,
} from './types';
import { BrickRegistry, defaultRegistry } from './registry';
import { validateSpecification } from './validator';

export function resolveArchitecture(
  spec: ProjectSpecification,
  registry: BrickRegistry = defaultRegistry
): ResolvedArchitecture {
  const activeBrickIds: string[] = [];

  // 1. Map specification flags to candidate brick IDs
  if (spec.backend.enabled) {
    if (spec.backend.language === 'rust') activeBrickIds.push('rust-backend');
    if (spec.backend.language === 'python') activeBrickIds.push('python-backend');
  }

  if (spec.frontend.enabled) {
    if (spec.frontend.framework === 'react') activeBrickIds.push('react-vite');
  }

  if (spec.frontend.tauri && spec.project.type === 'desktop') {
    activeBrickIds.push('tauri-desktop');
  }

  if (spec.database.enabled) {
    if (spec.database.type === 'sqlite') activeBrickIds.push('sqlite-storage');
    if (spec.database.type === 'postgresql') activeBrickIds.push('postgres-storage');
  }

  if (spec.api.style === 'rest') {
    activeBrickIds.push('rest-api');
  }

  if (spec.infrastructure.docker) {
    activeBrickIds.push('docker-infra');
  }

  if (spec.quality.ci || spec.quality.tests || spec.quality.lint) {
    activeBrickIds.push('quality-suite');
  }

  if (
    spec.documentation.readme ||
    spec.documentation.architectureDoc ||
    spec.documentation.installDoc ||
    spec.documentation.decisionsLog
  ) {
    activeBrickIds.push('docs-pack');
  }

  // Deduplicate and lookup active bricks
  const uniqueBrickIds = Array.from(new Set(activeBrickIds));
  const activeBricks: BrickDefinition[] = uniqueBrickIds
    .map((id) => registry.get(id))
    .filter((b): b is BrickDefinition => Boolean(b));

  // 2. Validate Specification & Constraints
  const issues = validateSpecification(spec, activeBricks, registry);

  // 3. Build Architectural Decisions Record (ADRs)
  const decisions: ArchitecturalDecision[] = [];
  let adrCounter = 1;
  const pad = (n: number) => `ADR-${String(n).padStart(3, '0')}`;

  if (spec.backend.enabled) {
    decisions.push({
      id: pad(adrCounter++),
      title: `Sélection du runtime ${spec.backend.language.toUpperCase()} (${spec.backend.framework})`,
      status: 'Accepted',
      context: 'Nécessité d\'un service backend fiable pour traiter la logique métier et servir les APIs.',
      decision: `Adoption de ${spec.backend.language} avec le framework ${spec.backend.framework} sur le port ${spec.backend.port}.`,
      consequences: [
        'Garantit une exécution déterministe avec typage statique strict.',
        'Consommation mémoire prévisible et latence réseau minimale.',
      ],
      generatingBrick: spec.backend.language === 'rust' ? 'rust-backend' : 'python-backend',
    });
  }

  if (spec.frontend.enabled) {
    decisions.push({
      id: pad(adrCounter++),
      title: `Adoption du frontend ${spec.frontend.framework.toUpperCase()} avec Vite`,
      status: 'Accepted',
      context: 'Nécessité d\'une interface réactive, ergonomique et compilée rapidement.',
      decision: 'Intégration de React 19 compilé par Vite avec Tailwind CSS pour un design system utilitaire.',
      consequences: [
        'Builds HMR ultra-rapides pour l\'expérience de développement.',
        'Architecture en composants découplée du backend.',
      ],
      generatingBrick: 'react-vite',
    });
  }

  if (spec.database.enabled) {
    decisions.push({
      id: pad(adrCounter++),
      title: `Persistance des données via ${spec.database.type.toUpperCase()}`,
      status: 'Accepted',
      context: 'Besoin de stocker durablement l\'état de l\'application.',
      decision: `Utilisation de ${spec.database.type} avec ${spec.database.orm} pour la couche d'accès aux données.`,
      consequences: [
        spec.database.type === 'sqlite'
          ? 'Zéro coût d\'infrastructure et persistance dans un fichier local unique.'
          : 'Support complet de la scalabilité multi-noeuds et conformité ACID en production.',
      ],
      generatingBrick: spec.database.type === 'sqlite' ? 'sqlite-storage' : 'postgres-storage',
    });
  }

  if (spec.infrastructure.docker) {
    decisions.push({
      id: pad(adrCounter++),
      title: 'Conteneurisation reproductible via Docker Multi-Stage',
      status: 'Accepted',
      context: 'Assurer la parité stricte entre environnement de dev et de production.',
      decision: 'Création d\'un Dockerfile multi-étapes avec compilation optimisée et runtime allégé.',
      consequences: [
        'Images finales minimales sans dépendances de compilation encombrantes.',
        'Déploiement en une commande via docker-compose up.',
      ],
      generatingBrick: 'docker-infra',
    });
  }

  // 4. Construct Component Nodes & Graph Edges
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];

  if (spec.frontend.enabled) {
    nodes.push({
      id: 'node-ui',
      name: spec.frontend.tauri ? 'Desktop UI (Tauri + React)' : 'Frontend Web (React 19)',
      category: 'frontend',
      layer: 'client',
      brickId: 'react-vite',
      description: 'Interface utilisateur Single-Page avec composants réactifs.',
      technologies: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS'],
      status: 'active',
    });
  }

  if (spec.api.style !== 'none') {
    nodes.push({
      id: 'node-api-gateway',
      name: `${spec.api.style.toUpperCase()} Gateway`,
      category: 'api',
      layer: 'gateway',
      brickId: spec.api.style === 'rest' ? 'rest-api' : 'websocket-api',
      description: 'Gestion des routes, validation des payloads et sérialisation JSON.',
      technologies: ['JSON Schema', spec.api.openapi ? 'OpenAPI 3.0' : 'REST Protocol'],
      status: 'active',
    });

    if (spec.frontend.enabled) {
      edges.push({
        from: 'node-ui',
        to: 'node-api-gateway',
        label: spec.frontend.tauri ? 'IPC / HTTP' : 'Fetch API',
        protocol: spec.api.style === 'websocket' ? 'WSS' : 'HTTP/JSON',
      });
    }
  }

  if (spec.backend.enabled) {
    nodes.push({
      id: 'node-backend',
      name: `Core Backend (${spec.backend.language})`,
      category: 'backend',
      layer: 'app',
      brickId: spec.backend.language === 'rust' ? 'rust-backend' : 'python-backend',
      description: 'Service applicatif traitant la logique métier et les règles de validation.',
      technologies: [spec.backend.language, spec.backend.framework, 'Tokio async'],
      status: 'active',
    });

    if (spec.api.style !== 'none') {
      edges.push({
        from: 'node-api-gateway',
        to: 'node-backend',
        label: 'Handler Dispatch',
        protocol: 'In-process Routing',
      });
    }
  }

  if (spec.database.enabled) {
    nodes.push({
      id: 'node-db',
      name: `${spec.database.type.toUpperCase()} Engine`,
      category: 'database',
      layer: 'data',
      brickId: spec.database.type === 'sqlite' ? 'sqlite-storage' : 'postgres-storage',
      description: 'Couche de stockage persistant et schémas relationnels avec migrations.',
      technologies: [spec.database.type, spec.database.orm, 'ACID'],
      status: 'active',
    });

    if (spec.backend.enabled) {
      edges.push({
        from: 'node-backend',
        to: 'node-db',
        label: 'Connection Pool',
        protocol: spec.database.type === 'sqlite' ? 'Direct File I/O' : 'TCP / SQLx Protocol',
      });
    }
  }

  if (spec.infrastructure.docker) {
    nodes.push({
      id: 'node-infra',
      name: 'Docker Runtime',
      category: 'infrastructure',
      layer: 'ops',
      brickId: 'docker-infra',
      description: 'Conteneurisation et isolation des environnements.',
      technologies: ['Docker Multi-Stage', 'Compose v2'],
      status: 'active',
    });
  }

  if (spec.quality.ci) {
    nodes.push({
      id: 'node-quality',
      name: 'GitHub Actions CI',
      category: 'quality',
      layer: 'ops',
      brickId: 'quality-suite',
      description: 'Pipelines d\'assurance qualité, linter et tests automatisés.',
      technologies: ['GitHub Actions', 'Clippy/Linter', 'Unit Tests'],
      status: 'active',
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    activeBricks,
    issues,
    nodes,
    edges,
    decisions,
    stats: {
      totalFiles: activeBricks.reduce((acc, b) => acc + b.templateFiles.length, 0) + 4,
      totalSizeKb: Math.round(activeBricks.length * 8.5 + 12),
      brickCount: activeBricks.length,
      estimatedSetupTimeMin: Math.max(1, Math.round(activeBricks.length * 1.5)),
    },
  };
}
