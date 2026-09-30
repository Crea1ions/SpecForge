/**
 * SpecForge Core - Pure spec edit helpers.
 * No React, no engine imports: extracted from ProjectWizard, behaviour unchanged.
 */

import { ApplicationTemplate, BackendConfig, ProjectSpecification } from './types';

/** Shallow-merge a patch into one spec section (a non-object section is replaced). */
export function mergeSection<K extends keyof ProjectSpecification>(
  spec: ProjectSpecification,
  key: K,
  val: Partial<ProjectSpecification[K]>
): ProjectSpecification {
  const current = spec[key];
  const updated = typeof current === 'object' && current !== null ? { ...current, ...val } : val;
  return { ...spec, [key]: updated };
}

export function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export function setBackendLanguage(spec: ProjectSpecification, language: BackendConfig['language']): ProjectSpecification {
  return mergeSection(spec, 'backend', { language, framework: language === 'rust' ? 'axum' : 'fastapi' });
}

export function setDatabaseType(spec: ProjectSpecification, type: ProjectSpecification['database']['type']): ProjectSpecification {
  return mergeSection(spec, 'database', { type, orm: 'sqlx' });
}

export function setAuthEnabled(spec: ProjectSpecification, enabled: boolean): ProjectSpecification {
  return mergeSection(spec, 'authentication', { enabled, provider: enabled ? 'jwt' : 'none' });
}

export function setDockerEnabled(spec: ProjectSpecification, docker: boolean): ProjectSpecification {
  return mergeSection(spec, 'infrastructure', { docker, compose: docker ? spec.infrastructure.compose : false });
}

/** Switch template: the preset (already resolved by the caller) replaces the spec, the user's project identity is kept. */
export function applyTemplatePreset(
  spec: ProjectSpecification,
  template: ApplicationTemplate,
  preset: { spec: ProjectSpecification }
): ProjectSpecification {
  const newSlug = preset.spec.project.slug;
  const defaultIdentifier =
    spec.project.identifier && !spec.project.identifier.startsWith('com.example.')
      ? spec.project.identifier
      : `com.acme.${newSlug.replace(/[^a-z0-9]/g, '')}`;

  return {
    ...preset.spec,
    project: {
      ...spec.project,
      name: preset.spec.project.name,
      slug: newSlug,
      identifier: template === 'mobile' ? defaultIdentifier : spec.project.identifier,
      description: preset.spec.project.description,
      type: preset.spec.project.type,
    },
  };
}
