/**
 * SpecForge - Modular Brick Library (Section 5 & 12)
 * Each brick is an autonomous software component that declares:
 * - provides: what capabilities it brings
 * - requires: what capabilities it strictly depends on
 * - conflictsWith: conflicting peers
 * - generateFiles: its own code & template generation logic
 * - generateDecisions: its contextual architectural decisions (ADRs)
 *
 * This completely decouples templates from the generation engine core.
 */

import { BrickDefinition } from '../types';
import { rustBackendBrick } from './rust-backend';
import { pythonBackendBrick } from './python-backend';
import { reactViteBrick } from './react-vite';
import { tauriDesktopBrick } from './tauri-desktop';
import { sqliteStorageBrick } from './sqlite-storage';
import { postgresStorageBrick } from './postgres-storage';
import { jwtAuthBrick } from './jwt-auth';
import { restApiBrick } from './rest-api';
import { openapiBrick } from './openapi';
import { systemdInfraBrick } from './systemd-infra';
import { dockerInfraBrick } from './docker-infra';
import { qualitySuiteBrick } from './quality-suite';
import { docsPackBrick } from './docs-pack';
import { workStructureBrick } from './work-structure';
import { rustWebFrontendBrick } from './rust-web-frontend';
import { rustWebAppBrick } from './rust-web-app';
import { rustDioxusMobileBrick } from './rust-dioxus-mobile';

export const DEFAULT_BRICKS: BrickDefinition[] = [
  rustBackendBrick,
  rustWebFrontendBrick,
  rustDioxusMobileBrick,
  rustWebAppBrick,
  pythonBackendBrick,
  reactViteBrick,
  tauriDesktopBrick,
  sqliteStorageBrick,
  postgresStorageBrick,
  restApiBrick,
  openapiBrick,
  jwtAuthBrick,
  dockerInfraBrick,
  systemdInfraBrick,
  qualitySuiteBrick,
  docsPackBrick,
  workStructureBrick,
];