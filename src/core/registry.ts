/**
 * SpecForge Core - Brick Registry
 * 
 * Manages the catalog of architectural bricks.
 * Provides lookup, capability matching, and dynamic registration of bricks.
 * Completely decoupled from UI and framework runtime.
 */

import { BrickDefinition } from './types';
import { DEFAULT_BRICKS } from './bricks/default-bricks';

export class BrickRegistry {
  private bricks: Map<string, BrickDefinition> = new Map();

  constructor(initialBricks: BrickDefinition[] = DEFAULT_BRICKS) {
    this.init(initialBricks);
  }

  private init(bricks: BrickDefinition[]) {
    this.bricks.clear();
    for (const b of bricks) {
      this.bricks.set(b.id, b);
    }
  }

  /**
   * Returns all currently registered bricks.
   */
  getAll(): BrickDefinition[] {
    return Array.from(this.bricks.values());
  }

  /**
   * Find a brick by its unique identifier.
   */
  get(id: string): BrickDefinition | undefined {
    return this.bricks.get(id);
  }

  /**
   * Register or overwrite a brick definition.
   */
  register(brick: BrickDefinition): void {
    this.bricks.set(brick.id, brick);
  }

  /**
   * Unregister a brick by its id.
   */
  unregister(id: string): boolean {
    return this.bricks.delete(id);
  }

  /**
   * Find all bricks providing a given capability.
   */
  findByCapability(capability: string): BrickDefinition[] {
    return this.getAll().filter((b) => b.provides.includes(capability));
  }

  /**
   * Reset registry back to the default built-in bricks.
   */
  reset(): void {
    this.init(DEFAULT_BRICKS);
  }

  /**
   * Create an isolated deep copy of this registry.
   */
  clone(): BrickRegistry {
    return new BrickRegistry(this.getAll());
  }
}

/**
 * Default global registry preloaded with built-in bricks.
 */
export const defaultRegistry = new BrickRegistry();
