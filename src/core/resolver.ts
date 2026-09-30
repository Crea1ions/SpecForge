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
import { selectByData } from './select';

export function resolveArchitecture(
  spec: ProjectSpecification,
  registry: BrickRegistry = defaultRegistry
): ResolvedArchitecture {
  // 1. Select active bricks from their declarative `applies` / `subsumes` data.
  const activeBricks: BrickDefinition[] = selectByData(spec, registry);

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
    if (brick.layer) return brick.layer;

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

  // The single backend runtime brick (rust-backend, python-backend, ...), if any.
  const backendBrick: string | null =
    activeBricks.find((brick) => brick.category === 'backend')?.id ?? null;

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
  if (backendBrick) {
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
    const runtimeBrick =
      backendBrick ?? (hasBrick('react-vite') ? 'react-vite' : null);

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
