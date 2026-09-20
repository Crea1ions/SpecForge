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
  GenerationContext,
} from './types';
import { BrickRegistry, defaultRegistry } from './registry';
import { validateSpecification } from './validator';

export function resolveArchitecture(
  spec: ProjectSpecification,
  registry: BrickRegistry = defaultRegistry
): ResolvedArchitecture {
  const activeBrickIds: string[] = [];

  // 1. Select the template-owned skeleton first.
  // Templates such as web-app own their complete base architecture;
  // generic bricks are only added when they represent optional capabilities.
  if (spec.template === 'web-app') {
      activeBrickIds.push('rust-web-app');
    } else if (spec.template === 'web-frontend' && spec.frontend.framework === 'askama') {
      activeBrickIds.push('rust-web-frontend');
    } else if (spec.template === 'mobile') {
      activeBrickIds.push('rust-dioxus-mobile');
    } else {
    if (spec.backend.enabled) {
      if (spec.backend.language === 'rust') activeBrickIds.push('rust-backend');
      if (spec.backend.language === 'python') activeBrickIds.push('python-backend');
    }

    if (spec.frontend.enabled) {
      if (spec.frontend.framework === 'react') {
        activeBrickIds.push('react-vite');
      }
    }

    if (spec.frontend.tauri && spec.project.type === 'desktop') {
      activeBrickIds.push('tauri-desktop');
    }

    if (spec.database.enabled) {
      if (spec.database.type === 'sqlite') activeBrickIds.push('sqlite-storage');
      if (spec.database.type === 'postgresql') activeBrickIds.push('postgres-storage');
    }
  }

  if (spec.api.style === 'rest') {
    activeBrickIds.push('rest-api');
  }

  if (spec.api.openapi) {
    activeBrickIds.push('openapi');
  }

  if (spec.authentication.enabled) {
    activeBrickIds.push('jwt-auth');
  }

  if (spec.infrastructure.docker) {
    activeBrickIds.push('docker-infra');
  }

  if (spec.infrastructure.systemd) {
    activeBrickIds.push('systemd-infra');
  }

  if (spec.quality.ci || spec.quality.tests || spec.quality.lint) {
    activeBrickIds.push('quality-suite');
  }

  if (spec.documentation.readme) {
    activeBrickIds.push('docs-pack');
  }

  if (spec.documentation.workStructure) {
    activeBrickIds.push('work-structure');
  }

  // Deduplicate and lookup active bricks
  const uniqueBrickIds = Array.from(new Set(activeBrickIds));
  const activeBricks: BrickDefinition[] = uniqueBrickIds
    .map((id) => registry.get(id))
    .filter((b): b is BrickDefinition => Boolean(b));

  // 2. Validate Specification & Constraints
  const issues = validateSpecification(spec, activeBricks, registry);

// 3. Build Architectural Decisions Record (ADRs)
// Each active brick owns the architectural decisions it introduces.
// The resolver only collects and normalizes their IDs.
const decisions: ArchitecturalDecision[] = [];
let adrCounter = 1;
const pad = (n: number) => `ADR-${String(n).padStart(3, '0')}`;

const decisionContext: GenerationContext = {
  spec,
  activeBricks,
  decisions: [],
};

for (const brick of activeBricks) {
  if (typeof brick.generateDecisions === 'function') {
    const brickDecisions = brick.generateDecisions(decisionContext);

    for (const decision of brickDecisions) {
      decisions.push({
        ...decision,
        id: pad(adrCounter++),
        generatingBrick: brick.id,
      });
    }
  }
}

  // 4. Construct Component Nodes & Graph Edges
  // Architecture nodes are derived from the bricks actually resolved.
  // The resolver only provides graph-specific layer/connectivity information.
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];

const getBrickLayer = (brick: BrickDefinition): ArchitectureNode['layer'] => {
  if (brick.id === 'rust-web-app') {
    return 'app';
  }

  switch (brick.category) {
    case 'frontend':
      return 'client';
    case 'api':
      return 'gateway';
    case 'backend':
      return 'app';
    case 'database':
      return 'data';
    case 'infrastructure':
    case 'quality':
    case 'documentation':
      return 'ops';
    default:
      return 'app';
  }
};

  for (const brick of activeBricks) {
    nodes.push({
      id: `node-${brick.id}`,
      name: brick.name,
      category: brick.category,
      layer: getBrickLayer(brick),
      brickId: brick.id,
      description: brick.description,
      technologies: brick.tags,
      status: 'active',
    });
  }

  const hasBrick = (brickId: string): boolean =>
    activeBricks.some((brick) => brick.id === brickId);

  const addEdge = (
    fromBrick: string,
    toBrick: string,
    label: string,
    protocol?: string
  ): void => {
    if (!hasBrick(fromBrick) || !hasBrick(toBrick)) return;

    edges.push({
      from: `node-${fromBrick}`,
      to: `node-${toBrick}`,
      label,
      ...(protocol ? { protocol } : {}),
    });
  };

  // Core application flow
  if (hasBrick('rust-web-app')) {
    addEdge(
      'rust-web-app',
      'rest-api',
      'HTTP API',
      'HTTP/JSON'
    );
  }

  // Generic backend/API relationship
  if (hasBrick('rust-backend') || hasBrick('python-backend')) {
    const backendBrick = hasBrick('rust-backend')
      ? 'rust-backend'
      : 'python-backend';

    addEdge(
      backendBrick,
      'rest-api',
      'API',
      'HTTP/JSON'
    );
  }

  // Frontend/API relationship for the legacy compositional architecture
  if (hasBrick('react-vite')) {
    addEdge(
      'react-vite',
      'rest-api',
      'Fetch API',
      'HTTP/JSON'
    );
  }

  // Persistence relationships
  if (hasBrick('rust-web-app')) {
    // SQLite/SQLx persistence is part of the rust-web-app skeleton.
    // No separate sqlite-storage brick is required.
  } else {
    const backendBrick = hasBrick('rust-backend')
      ? 'rust-backend'
      : hasBrick('python-backend')
        ? 'python-backend'
        : null;

    if (backendBrick && hasBrick('sqlite-storage')) {
      addEdge(
        backendBrick,
        'sqlite-storage',
        'Connection Pool',
        'Direct File I/O'
      );
    }

    if (backendBrick && hasBrick('postgres-storage')) {
      addEdge(
        backendBrick,
        'postgres-storage',
        'Connection Pool',
        'TCP / SQLx Protocol'
      );
    }
  }

  // Optional infrastructure and quality capabilities
  if (hasBrick('rust-web-app')) {
    addEdge(
      'rust-web-app',
      'docker-infra',
      'Container Runtime',
      'Docker'
    );

    addEdge(
      'rust-web-app',
      'quality-suite',
      'Quality Pipeline',
      'GitHub Actions'
    );
  } else {
    const runtimeBrick = hasBrick('rust-backend')
      ? 'rust-backend'
      : hasBrick('python-backend')
        ? 'python-backend'
        : hasBrick('react-vite')
          ? 'react-vite'
          : null;

    if (runtimeBrick) {
      addEdge(
        runtimeBrick,
        'docker-infra',
        'Container Runtime',
        'Docker'
      );

      addEdge(
        runtimeBrick,
        'quality-suite',
        'Quality Pipeline',
        'GitHub Actions'
      );
    }
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
