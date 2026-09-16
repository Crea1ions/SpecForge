/**
 * Backward compatibility bridge.
 * Brick definitions and Registry have moved to /src/core/
 */
import { BrickDefinition } from '../core/types';
import { defaultRegistry } from '../core/registry';
import { DEFAULT_BRICKS } from '../core/bricks/default-bricks';

export { DEFAULT_BRICKS };

export const BRICK_LIBRARY: BrickDefinition[] = defaultRegistry.getAll();

export function findBrickById(id: string): BrickDefinition | undefined {
  return defaultRegistry.get(id);
}

export function registerCustomBrick(brick: BrickDefinition): void {
  defaultRegistry.register(brick);
}

export function unregisterCustomBrick(id: string): void {
  defaultRegistry.unregister(id);
}
