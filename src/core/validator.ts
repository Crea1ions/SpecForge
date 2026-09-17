/**
 * SpecForge Core - Architecture & Specification Validator
 * 
 * Performs deterministic validation of:
 * - Brick dependency requirements (`requires`)
 * - Mutual exclusion conflicts (`conflictsWith`)
 * - Architectural consistency constraints
 * 
 * Free of UI and framework dependencies.
 */

import { ProjectSpecification, BrickDefinition, ValidationIssue } from './types';
import { BrickRegistry } from './registry';

export function validateSpecification(
  spec: ProjectSpecification,
  activeBricks: BrickDefinition[],
  registry: BrickRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const uniqueBrickIds = activeBricks.map((b) => b.id);
  const providedCapabilities = new Set<string>();

  activeBricks.forEach((b) => {
    b.provides.forEach((p) => providedCapabilities.add(p));
  });

  // 1. Validate Brick Dependencies (requires)
  for (const brick of activeBricks) {
    for (const req of brick.requires) {
      if (!providedCapabilities.has(req) && !uniqueBrickIds.includes(req)) {
        issues.push({
          id: `missing-dep-${brick.id}-${req}`,
          severity: 'error',
          title: `Dépendance non satisfaite pour [${brick.name}]`,
          message: `La brique '${brick.name}' requiert la capacité ou brique '${req}', qui n'est actuellement pas activée dans la spécification.`,
          source: 'dependency',
          fixSuggestion: `Activez la brique correspondante ou ajustez la spécification (ex: activez le backend).`,
          affectedBricks: [brick.id],
        });
      }
    }

    // 2. Validate Explicit Conflicts (conflictsWith)
    for (const conflict of brick.conflictsWith) {
      if (uniqueBrickIds.includes(conflict)) {
        const conflictBrick = registry.get(conflict);
        issues.push({
          id: `conflict-${brick.id}-${conflict}`,
          severity: 'error',
          title: `Conflit d'architecture entre [${brick.name}] et [${conflictBrick?.name || conflict}]`,
          message: `Ces deux briques ne peuvent pas coexister dans la même cible d'exécution.`,
          source: 'compatibility',
          fixSuggestion: `Désactivez l'une des deux briques pour garantir un déploiement déterministe.`,
          affectedBricks: [brick.id, conflict],
        });
      }
    }
  }

  // 3. Domain Compatibility Constraints
  // Tauri is only supported for desktop projects.
  if (spec.frontend.tauri && spec.project.type !== 'desktop') {
    issues.push({
      id: 'tauri-requires-desktop',
      severity: 'error',
      title: 'Tauri nécessite un projet Desktop',
      message: `La couche Tauri n'est supportée que pour les projets de type 'desktop'. Le projet actuel est de type '${spec.project.type}'.`,
      source: 'compatibility',
      fixSuggestion: "Changez le type du projet en 'desktop' ou désactivez Tauri.",
    });
  }

  if (spec.project.type === 'desktop') {
    if (!spec.frontend.enabled) {
      issues.push({
        id: 'desktop-no-frontend',
        severity: 'error',
        title: 'Application Desktop sans interface',
        message: "Un projet de type 'desktop' avec Tauri nécessite obligatoirement un frontend activé (React + Vite).",
        source: 'compatibility',
        fixSuggestion: 'Activez le frontend dans la spécification.',
      });
    }
    if (spec.backend.language !== 'rust') {
      issues.push({
        id: 'tauri-rust-mismatch',
        severity: 'warning',
        title: 'Compatibilité Tauri et langage Backend',
        message: `Tauri est nativement couplé à Rust. Le backend choisi (${spec.backend.language}) sera exécuté en sous-processus sidecar plutôt qu'intégré au binaire natif.`,
        source: 'compatibility',
        fixSuggestion: 'Basculez le backend sur Rust pour des performances optimales et une taille de binaire minimale.',
      });
    }
  }

  if (spec.database.enabled && !spec.backend.enabled) {
    issues.push({
      id: 'db-without-backend',
      severity: 'error',
      title: 'Base de données orpheline',
      message: 'Une base de données a été activée sans aucun service backend pour la piloter.',
      source: 'dependency',
      fixSuggestion: 'Activez le backend pour exposer vos requêtes et modèles de données.',
    });
  }

  if (spec.backend.enabled && spec.backend.language === 'rust' && spec.backend.framework !== 'axum') {
    issues.push({
      id: `unsupported-framework-rust-${spec.backend.framework}`,
      severity: 'error',
      title: `Framework Rust non supporté (${spec.backend.framework})`,
      message: `Le framework '${spec.backend.framework}' n'est pas supporté pour le backend Rust. Seul 'axum' est supporté actuellement par la brique rust-backend.`,
      source: 'configuration',
      fixSuggestion: "Définissez 'backend.framework: axum' dans la spécification.",
    });
  }

  if (spec.database.enabled && spec.backend.enabled && spec.backend.language === 'rust' && spec.database.orm !== 'sqlx') {
    issues.push({
      id: `unsupported-orm-rust-${spec.database.orm}`,
      severity: 'error',
      title: `ORM non supporté pour Rust (${spec.database.orm})`,
      message: `L'ORM '${spec.database.orm}' n'est pas supporté pour le backend Rust. Seul 'sqlx' est supporté actuellement.`,
      source: 'configuration',
      fixSuggestion: "Définissez 'database.orm: sqlx' dans la spécification.",
    });
  }

  if (spec.database.type === 'postgresql' && !spec.infrastructure.docker && spec.project.type !== 'desktop') {
    issues.push({
      id: 'postgres-no-docker',
      severity: 'warning',
      title: 'PostgreSQL sans Docker local',
      message: 'PostgreSQL est sélectionné mais Docker n\'est pas activé. Le développeur devra avoir une instance PostgreSQL locale ou hébergée déjà démarrée.',
      source: 'configuration',
      fixSuggestion: 'Activez Docker Compose dans l\'infrastructure pour démarrer automatiquement PostgreSQL en local.',
    });
  }

  // 4. Authentication Support Constraints
  if (spec.authentication.enabled) {
    issues.push({
      id: `unsupported-authentication-${spec.authentication.provider}`,
      severity: 'error',
      title: `Authentification non supportée (${spec.authentication.provider})`,
      message: `L'authentification '${spec.authentication.provider}' est demandée mais aucune brique d'authentification correspondante n'est actuellement disponible dans le registre Core.`,
      source: 'configuration',
      fixSuggestion: "Désactivez l'authentification ('authentication.enabled: false') ou définissez 'provider: none'.",
    });
  }

  return issues;
}
