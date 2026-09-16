/**
 * SpecForge Core - Public Engine API
 * 
 * Autonomous, deterministic specification and architecture engine.
 * Decoupled from React, DOM, and presentation libraries.
 */

import { ProjectSpecification, ResolvedArchitecture, GeneratedFile, ValidationIssue } from './types';
import { BrickRegistry, defaultRegistry } from './registry';
import { resolveArchitecture } from './resolver';
import { generateProjectFiles } from './generator';
import { validateSpecification } from './validator';
import { computeDeterministicFilesHash, getContentByteLength } from './utils';

export * from './types';
export * from './registry';
export * from './validator';
export * from './resolver';
export * from './generator';
export * from './utils';

/**
 * Unified Core Facade
 */
export const SpecForge = {
  /**
   * Validates a specification against current architectural constraints and active bricks.
   */
  validate(
    spec: ProjectSpecification,
    registry: BrickRegistry = defaultRegistry
  ): ValidationIssue[] {
    const arch = resolveArchitecture(spec, registry);
    return arch.issues;
  },

  /**
   * Resolves active bricks, dependency graph, ADRs, and structural consistency.
   */
  resolve(
    spec: ProjectSpecification,
    registry: BrickRegistry = defaultRegistry
  ): ResolvedArchitecture {
    return resolveArchitecture(spec, registry);
  },

  /**
   * Generates all project files and Source of Truth, blocking on errors.
   */
  generate(
    spec: ProjectSpecification,
    architecture?: ResolvedArchitecture,
    registry: BrickRegistry = defaultRegistry
  ): GeneratedFile[] {
    return generateProjectFiles(spec, architecture, registry);
  },

  /**
   * Computes an exact deterministic hash across file contents and paths.
   */
  computeHash(files: GeneratedFile[]): string {
    return computeDeterministicFilesHash(files);
  },

  /**
   * Default brick registry.
   */
  registry: defaultRegistry,
};
