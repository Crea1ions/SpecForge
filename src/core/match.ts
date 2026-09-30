/**
 * SpecForge Core - Spec matching
 *
 * Pure evaluation of a SpecPattern against a ProjectSpecification.
 * Free of UI and framework dependencies.
 */

import { ProjectSpecification, SpecPattern } from './types';

const matchNode = (value: unknown, pattern: unknown): boolean => {
  if (Array.isArray(pattern)) {
    return pattern.some((accepted) => Object.is(accepted, value));
  }
  if (pattern !== null && typeof pattern === 'object') {
    if (value === null || typeof value !== 'object') return false;
    return Object.entries(pattern).every(
      ([key, sub]) =>
        sub === undefined ||
        matchNode((value as Record<string, unknown>)[key], sub),
    );
  }
  return Object.is(pattern, value);
};

export const matchesSpec = (
  spec: ProjectSpecification,
  pattern: SpecPattern,
): boolean => matchNode(spec, pattern);
