/**
 * SpecForge Core - Data-driven brick selection
 *
 * A brick is a candidate when one of its `applies` patterns matches the spec (OR).
 * A brick with `subsumes` owns whole categories: candidates of those categories
 * are dropped, unless the brick itself belongs to one of them.
 * Result order is the registry order.
 */

import type { ProjectSpecification, BrickDefinition, BrickCategory } from './types';
import type { BrickRegistry } from './registry';
import { matchesSpec } from './match';

export function selectByData(
  spec: ProjectSpecification,
  registry: BrickRegistry
): BrickDefinition[] {
  const candidates = registry
    .getAll()
    .filter((b) => b.applies?.some((p) => matchesSpec(spec, p)));

  const subsumed = new Set<BrickCategory>();
  for (const b of candidates) {
    b.subsumes?.forEach((c) => subsumed.add(c));
  }

  return candidates.filter(
    (b) => b.subsumes?.includes(b.category) || !subsumed.has(b.category)
  );
}
