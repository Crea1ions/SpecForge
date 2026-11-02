/**
 * SpecForge Core — Aperçu UI/UX de l'éditeur (templates applicatifs)
 *
 * L'aperçu délègue au renderer de la cible native résolue (Askama, React,
 * Dioxus) : il correspond au moteur qui produira l'application. Pour les
 * templates API-only, il reflète le site documentaire `docs-site/` (renderer
 * Static Web, réutilisé pour cette sortie uniquement).
 */

import { ProjectSpecification, ProjectUiUxConfig } from '../types';
import { renderStaticWebPreview } from '../static-web/render';
import { resolveUiUxRenderTarget } from './registry';
import { renderAskamaUiUxPreview } from './implementations/askama';
import { renderReactUiUxPreview } from './implementations/react';
import { renderDioxusUiUxPreview } from './implementations/dioxus';

export function renderProjectUiUxPreview(
  spec: ProjectSpecification,
  config: ProjectUiUxConfig,
  selectedSlug?: string,
  mode: 'light' | 'dark' = 'light',
): string {
  const target = resolveUiUxRenderTarget(spec);
  switch (target) {
    case 'askama':
      return renderAskamaUiUxPreview(spec, config, selectedSlug, mode);
    case 'react':
      return renderReactUiUxPreview(spec, config, selectedSlug, mode);
    case 'dioxus':
      return renderDioxusUiUxPreview(spec, config, selectedSlug, mode);
    default:
      return renderStaticWebPreview(config, selectedSlug, 'static-documentation', spec.project.name);
  }
}
