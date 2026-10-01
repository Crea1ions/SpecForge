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

  for (const brick of activeBricks) {
    nodes.push({
      id: `node-${brick.id}`,
      name: brick.name,
      category: brick.category,
      layer: brick.layer,
      brickId: brick.id,
      description: brick.description,
      technologies: brick.tags,
      status: 'active',
    });
  }

  // Edges are declared on the target brick (`links`). Each link yields at most one
  // edge, from the first active source: a brick id, or the first brick of a category.
  for (const target of activeBricks) {
    for (const link of target.links ?? []) {
      let source: BrickDefinition | undefined;
      for (const from of link.from) {
        source = activeBricks.find((b) =>
          typeof from === 'string' ? b.id === from : b.category === from.category
        );
        if (source) break;
      }
      if (!source) continue;

      edges.push({
        from: `node-${source.id}`,
        to: `node-${target.id}`,
        label: link.label,
        ...(link.protocol ? { protocol: link.protocol } : {}),
      });
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
