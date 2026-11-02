/**
 * SpecForge Core — Registre des implémentations natives des bricks UI/UX
 *
 * Une même définition de brick (`ui-ux/bricks.ts`) peut avoir plusieurs
 * implémentations, une par cible de rendu (Askama, React, Dioxus). Le Core
 * résout ici l'implémentation à utiliser pour la cible du template.
 */

import {
  ProjectUiUxBrickImplementation,
  UiUxRenderTarget,
} from '../../types';
import { ASKAMA_BRICK_IMPLEMENTATIONS } from './askama';
import { REACT_BRICK_IMPLEMENTATIONS } from './react';
import { DIOXUS_BRICK_IMPLEMENTATIONS } from './dioxus';

export class ProjectUiUxImplementationRegistry {
  private readonly implementations = new Map<string, ProjectUiUxBrickImplementation>();

  constructor(definitions: ProjectUiUxBrickImplementation[] = []) {
    definitions.forEach((implementation) => this.register(implementation));
  }

  private key(brickId: string, target: UiUxRenderTarget): string {
    return `${target}:${brickId}`;
  }

  getAll(): ProjectUiUxBrickImplementation[] {
    return [...this.implementations.values()];
  }

  get(brickId: string, target: UiUxRenderTarget): ProjectUiUxBrickImplementation | undefined {
    return this.implementations.get(this.key(brickId, target));
  }

  has(brickId: string, target: UiUxRenderTarget): boolean {
    return this.implementations.has(this.key(brickId, target));
  }

  register(implementation: ProjectUiUxBrickImplementation): void {
    this.implementations.set(this.key(implementation.brickId, implementation.target), implementation);
  }
}

export const projectUiUxImplementationRegistry = new ProjectUiUxImplementationRegistry([
  ...ASKAMA_BRICK_IMPLEMENTATIONS,
  ...REACT_BRICK_IMPLEMENTATIONS,
  ...DIOXUS_BRICK_IMPLEMENTATIONS,
]);

export function getUiUxBrickImplementation(
  brickId: string,
  target: UiUxRenderTarget,
): ProjectUiUxBrickImplementation | undefined {
  return projectUiUxImplementationRegistry.get(brickId, target);
}

export function hasUiUxBrickImplementation(brickId: string, target: UiUxRenderTarget): boolean {
  return projectUiUxImplementationRegistry.has(brickId, target);
}
