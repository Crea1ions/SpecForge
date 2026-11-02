/**
 * SpecForge Core — Intégration UI/UX des templates applicatifs
 *
 * Déclare, pour chaque couple profil/template, la cible de rendu native
 * utilisée pour alimenter son interface (Askama, React, Dioxus), ou l'absence
 * d'interface native (API-only). La résolution est déterministe et ne dépend
 * que du profil et du template.
 */

import {
  ApplicationTemplate,
  ProjectSpecification,
  ProjectUiUxTemplateIntegration,
  TechnicalProfile,
  UiUxRenderTarget,
} from '../types';

export const UI_UX_TEMPLATE_INTEGRATIONS: ProjectUiUxTemplateIntegration[] = [
  { profile: 'rust', template: 'web-app', target: 'askama', hasNativeUi: true },
  { profile: 'rust', template: 'web-frontend', target: 'askama', hasNativeUi: true },
  { profile: 'rust', template: 'web-platform', target: 'react', hasNativeUi: true },
  { profile: 'rust', template: 'ecommerce', target: 'react', hasNativeUi: true, supportsContentPages: false },
  { profile: 'rust', template: 'desktop', target: 'react', hasNativeUi: true },
  { profile: 'rust', template: 'mobile', target: 'dioxus', hasNativeUi: true },
  { profile: 'rust', template: 'api-service', target: null, hasNativeUi: false },
  { profile: 'python', template: 'api-service', target: null, hasNativeUi: false },
  { profile: 'go', template: 'api-service', target: null, hasNativeUi: false },
  { profile: 'typescript', template: 'web-frontend', target: 'react', hasNativeUi: true },
];

export function resolveUiUxTemplateIntegration(
  profile: TechnicalProfile,
  template: ApplicationTemplate,
): ProjectUiUxTemplateIntegration | undefined {
  return UI_UX_TEMPLATE_INTEGRATIONS.find(
    (integration) => integration.profile === profile && integration.template === template,
  );
}

/** Cible de rendu native du template, ou null pour un template API-only. */
export function resolveUiUxRenderTarget(spec: ProjectSpecification): UiUxRenderTarget | null {
  return resolveUiUxTemplateIntegration(spec.profile, spec.template)?.target ?? null;
}

/** Template sans interface native : seule la sortie documentaire est possible. */
export function isApiOnlyUiUxTemplate(spec: ProjectSpecification): boolean {
  if (spec.profile === 'static-web') return false;
  const integration = resolveUiUxTemplateIntegration(spec.profile, spec.template);
  return integration ? !integration.hasNativeUi : !spec.frontend.enabled;
}

/** La configuration UI/UX produit-elle un site documentaire `docs-site/` ? */
export function shouldGenerateUiUxDocsSite(spec: ProjectSpecification): boolean {
  return Boolean(spec.uiUx?.docsSite) && isApiOnlyUiUxTemplate(spec);
}
