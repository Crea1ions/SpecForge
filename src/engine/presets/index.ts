/**
 * SpecForge - Curated Architecture Presets
 * Pre-configured targets defined in Section 18 of the specification
 */

import { ProjectSpecification } from '../../core';
import { ArchitecturePreset } from './types';
import { rustWebAppPreset } from './rust-web-app';
import { rustReactPostgresPreset } from './rust-react-postgres';
import { rustTauriReactPreset } from './rust-tauri-react';
import { rustBackendOnlyPreset } from './rust-backend-only';
import { reactFrontendOnlyPreset } from './react-frontend-only';
import { rustWebFrontendPreset } from './rust-web-frontend';
import { rustDioxusMobilePreset } from './rust-dioxus-mobile';

export type { ArchitecturePreset } from './types';

export const PRESETS: ArchitecturePreset[] = [
  rustWebAppPreset,
  rustReactPostgresPreset,
  rustTauriReactPreset,
  rustBackendOnlyPreset,
  reactFrontendOnlyPreset,
  rustWebFrontendPreset,
  rustDioxusMobilePreset,
];

export const findPreset = (
  profile: ProjectSpecification['profile'],
  template: ProjectSpecification['template'],
): ArchitecturePreset | undefined =>
  PRESETS.find(
    (preset) =>
      preset.spec.profile === profile &&
      preset.spec.template === template,
  );
