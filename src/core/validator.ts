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
import { validateStaticWebConfig } from './static-web/bricks';

export function validateSpecification(
  spec: ProjectSpecification,
  activeBricks: BrickDefinition[],
  registry: BrickRegistry
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const uiUxConfig = spec.profile === 'static-web' ? spec.staticWeb : spec.uiUx;
  issues.push(...validateStaticWebConfig(spec.profile, spec.template, uiUxConfig));

  const supportedTemplates: Record<ProjectSpecification['profile'], ProjectSpecification['template'][]> = {
    rust: ['web-frontend', 'web-app', 'web-platform', 'ecommerce', 'api-service', 'desktop', 'mobile'],
    python: ['api-service'],
    go: ['api-service'],
    typescript: ['web-frontend'],
    'static-web': ['static-documentation', 'static-website', 'static-landing-page'],
  };
  if (!supportedTemplates[spec.profile].includes(spec.template)) {
    issues.push({
      id: `unsupported-profile-template-${spec.profile}-${spec.template}`,
      severity: 'error',
      title: 'Combinaison profil / template indisponible',
      message: `Le template '${spec.template}' n’est pas encore implémenté pour le profil '${spec.profile}'.`,
      source: 'compatibility',
      fixSuggestion: 'Choisissez un template réellement proposé pour ce profil.',
    });
  }

  if (spec.profile === 'static-web') {
    if (spec.project.type !== 'static-site') {
      issues.push({
        id: 'static-web-project-type-invalid',
        severity: 'error',
        title: 'Type de projet Static Web invalide',
        message: "Le profil Static Web exige le type de projet 'static-site'.",
        source: 'configuration',
      });
    }
    if (
      spec.backend.enabled ||
      spec.database.enabled ||
      spec.api.style !== 'none' ||
      spec.authentication.enabled
    ) {
      issues.push({
        id: 'static-web-server-feature-enabled',
        severity: 'error',
        title: 'Le profil Static Web doit rester autonome',
        message: 'Désactivez le backend, la base de données, l’API et l’authentification pour générer un site statique sans serveur.',
        source: 'compatibility',
      });
    }
    if (
      !spec.frontend.enabled ||
      spec.frontend.framework !== 'static-html' ||
      spec.frontend.bundler !== 'none'
    ) {
      issues.push({
        id: 'static-web-frontend-invalid',
        severity: 'error',
        title: 'Configuration frontend Static Web invalide',
        message: 'Le profil Static Web utilise du HTML/CSS/JavaScript sans framework ni bundler.',
        source: 'configuration',
      });
    }
  }

  if (spec.profile === 'typescript' &&
      (!spec.frontend.enabled ||
        spec.frontend.framework !== 'react' ||
        spec.frontend.bundler !== 'vite' ||
        spec.frontend.language !== 'typescript' ||
        spec.backend.enabled)) {
    issues.push({
      id: 'typescript-web-frontend-configuration-invalid',
      severity: 'error',
      title: 'Configuration TypeScript Web Frontend invalide',
      message: 'Le template TypeScript disponible nécessite React/Vite et ne fournit pas de backend TypeScript.',
      source: 'configuration',
      fixSuggestion: 'Restaurez le preset React/Vite TypeScript Web Frontend.',
    });
  }

  if (
    (spec.profile === 'python' || spec.profile === 'go') &&
    (spec.template !== 'api-service' ||
      !spec.backend.enabled ||
      spec.backend.language !== spec.profile ||
      spec.api.style !== 'rest')
  ) {
    issues.push({
      id: `${spec.profile}-api-service-configuration-invalid`,
      severity: 'error',
      title: `Configuration API Service ${spec.profile} invalide`,
      message: `Le premier template ${spec.profile} nécessite un backend ${spec.profile} actif et une API REST.`,
      source: 'configuration',
      fixSuggestion: `Restaurez le preset ${spec.profile} API Service.`,
    });
  }

  if (
    spec.profile === 'rust' &&
    spec.backend.enabled &&
    spec.backend.language !== 'rust'
  ) {
    issues.push({
      id: 'rust-profile-backend-language-invalid',
      severity: 'error',
      title: 'Langage backend incompatible avec le profil Rust',
      message: 'Un backend actif du profil Rust doit être généré en Rust.',
      source: 'compatibility',
      fixSuggestion: "Définissez 'backend.language: rust' ou choisissez le profil du backend cible.",
    });
  }

  if (
    spec.profile === 'go' &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.project.slug)
  ) {
    issues.push({
      id: 'go-module-slug-invalid',
      severity: 'error',
      title: 'Identifiant de module Go invalide',
      message: 'Le slug du projet Go doit être composé de segments minuscules séparés par des tirets.',
      source: 'configuration',
      fixSuggestion: "Utilisez un slug comme 'go-api-service'.",
    });
  }

  if (
    spec.backend.enabled &&
    spec.backend.language === 'python' &&
    spec.backend.framework !== 'fastapi'
  ) {
    issues.push({
      id: `unsupported-framework-python-${spec.backend.framework}`,
      severity: 'error',
      title: `Framework Python non supporté (${spec.backend.framework})`,
      message: "Le profil Python génère actuellement des services avec FastAPI.",
      source: 'configuration',
      fixSuggestion: "Définissez 'backend.framework: fastapi'.",
    });
  }

  if (
    spec.backend.enabled &&
    spec.backend.language === 'go' &&
    spec.backend.framework !== 'net/http'
  ) {
    issues.push({
      id: `unsupported-framework-go-${spec.backend.framework}`,
      severity: 'error',
      title: `Framework Go non supporté (${spec.backend.framework})`,
      message: "Le premier template Go génère un service avec le serveur standard net/http.",
      source: 'configuration',
      fixSuggestion: "Définissez 'backend.framework: net/http'.",
    });
  }

  if (spec.backend.enabled && spec.backend.language === 'typescript') {
    issues.push({
      id: 'unsupported-backend-typescript',
      severity: 'error',
      title: 'Backend TypeScript indisponible',
      message: 'Le profil TypeScript implémenté couvre uniquement le frontend React/Vite.',
      source: 'compatibility',
      fixSuggestion: 'Désactivez le backend ou choisissez un profil backend réellement disponible.',
    });
  }

  if (spec.backend.enabled && (!Number.isInteger(spec.backend.port) || spec.backend.port < 1 || spec.backend.port > 65535)) {
    issues.push({
      id: 'backend-port-invalid',
      severity: 'error',
      title: 'Port backend invalide',
      message: 'Le port backend doit être un entier compris entre 1 et 65535.',
      source: 'configuration',
      fixSuggestion: 'Choisissez un port valide, par exemple 8000 ou 8080.',
    });
  }

  if (
    spec.backend.enabled &&
    (spec.backend.language === 'python' || spec.backend.language === 'go')
  ) {
    if (spec.database.enabled) {
      issues.push({
        id: `unsupported-database-${spec.backend.language}`,
        severity: 'error',
        title: `Base de données non intégrée pour ${spec.backend.language}`,
        message: `Le template ${spec.backend.language} API Service ne génère pas encore de persistance; les briques SQL disponibles génèrent actuellement du code Rust.`,
        source: 'compatibility',
        fixSuggestion: 'Désactivez la base de données jusqu’à ce qu’une intégration compatible soit livrée.',
      });
    }

    if (spec.authentication.enabled || spec.api.auth) {
      issues.push({
        id: `unsupported-authentication-${spec.backend.language}`,
        severity: 'error',
        title: `Authentification non intégrée pour ${spec.backend.language}`,
        message: `La brique JWT disponible génère actuellement du code Rust et ne peut pas être activée pour ${spec.backend.language}.`,
        source: 'compatibility',
        fixSuggestion: 'Désactivez JWT jusqu’à ce qu’une brique compatible soit livrée.',
      });
    }

    if (spec.infrastructure.docker) {
      issues.push({
        id: `unsupported-docker-${spec.backend.language}`,
        severity: 'error',
        title: `Conteneurisation non intégrée pour ${spec.backend.language}`,
        message: 'Le générateur Docker ne produit pas encore une image exécutable pour ce runtime.',
        source: 'compatibility',
        fixSuggestion: 'Désactivez Docker jusqu’à ce qu’un Dockerfile adapté soit disponible.',
      });
    }

    if (spec.infrastructure.systemd) {
      issues.push({
        id: `unsupported-systemd-${spec.backend.language}`,
        severity: 'error',
        title: `Service systemd non intégré pour ${spec.backend.language}`,
        message: 'Le générateur systemd actuel ne cible pas correctement ce runtime.',
        source: 'compatibility',
        fixSuggestion: 'Désactivez systemd jusqu’à ce qu’une unité adaptée soit générée.',
      });
    }
  }

  if (spec.template === 'ecommerce') {
    const requiredConfiguration =
      spec.profile === 'rust' &&
      spec.backend.enabled &&
      spec.backend.language === 'rust' &&
      spec.backend.framework === 'axum' &&
      spec.frontend.enabled &&
      spec.frontend.framework === 'react' &&
      spec.frontend.bundler === 'vite' &&
      spec.database.enabled &&
      spec.database.type === 'postgresql' &&
      spec.database.orm === 'sqlx' &&
      spec.database.migrations &&
      spec.api.style === 'rest' &&
      spec.api.auth &&
      spec.api.openapi &&
      spec.authentication.enabled &&
      spec.authentication.provider === 'jwt' &&
      spec.infrastructure.docker &&
      spec.infrastructure.compose &&
      spec.quality.tests &&
      spec.documentation.readme;

    if (!requiredConfiguration) {
      issues.push({
        id: 'ecommerce-stack-incomplete',
        severity: 'error',
        title: 'Socle e-commerce incomplet',
        message:
          "Le template e-commerce nécessite Rust/Axum, React/Vite, PostgreSQL/SQLx avec migrations, REST/OpenAPI/JWT, Docker Compose, tests et README.",
        source: 'configuration',
        fixSuggestion: 'Restaurez les capacités requises du preset Rust E-commerce.',
      });
    }
  }

  const uniqueBrickIds = activeBricks.map((b) => b.id);
  const providedCapabilities = new Set<string>();

  if (spec.template === 'ecommerce') {
    const requiredBricks = [
      'rust-backend',
      'react-vite',
      'postgres-storage',
      'rest-api',
      'openapi',
      'jwt-auth',
      'docker-infra',
      'quality-suite',
      'docs-pack',
      'work-structure',
      'ecom-catalog',
      'ecom-pricing',
      'ecom-cart-orders',
      'ecom-accounts',
      'ecom-payment-mock',
      'ecom-inventory-fulfillment',
      'ecom-notifications',
      'ecom-audit-ops',
      'ecom-admin',
    ];

    for (const brickId of requiredBricks) {
      if (!uniqueBrickIds.includes(brickId)) {
        issues.push({
          id: `ecommerce-brick-missing-${brickId}`,
          severity: 'error',
          title: 'Brique e-commerce indisponible',
          message: `La génération e-commerce requiert la brique '${brickId}', absente du registre actif.`,
          source: 'dependency',
          fixSuggestion: 'Enregistrez toutes les briques e-commerce avant de proposer le preset.',
          affectedBricks: [brickId],
        });
      }
    }
  }

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

  // Mobile : l'identifiant (bundle id iOS / applicationId Android) est lu par la brique
  // rust-dioxus-mobile, elle-même sélectionnée d'après spec.template.
  if (spec.template === 'mobile' || spec.project.type === 'mobile') {
    const identifier = spec.project.identifier;
    // Intersection stricte Android/iOS : segments alphanumériques commençant par une lettre.
    const identifierPattern = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;

    if (!identifier || identifier.trim() === '') {
      issues.push({
        id: 'mobile-identifier-missing',
        severity: 'error',
        title: 'Identifiant mobile manquant',
        message: "Un projet mobile exige un identifiant d'application (bundle identifier iOS / applicationId Android), par exemple 'com.acme.monapp'.",
        source: 'configuration',
        fixSuggestion: "Renseignez 'project.identifier' au format reverse-DNS.",
      });
    } else if (!identifierPattern.test(identifier)) {
      issues.push({
        id: 'mobile-identifier-invalid',
        severity: 'error',
        title: `Identifiant mobile invalide (${identifier})`,
        message: "L'identifiant doit contenir au moins deux segments séparés par des points ; chaque segment commence par une lettre et ne contient que des lettres et des chiffres (ni tiret, ni underscore, compatibles Android et iOS).",
        source: 'configuration',
        fixSuggestion: "Utilisez un format comme 'com.acme.monapp'.",
      });
    } else if (/^com\.example(\.|$)/i.test(identifier)) {
      issues.push({
        id: 'mobile-identifier-placeholder',
        severity: 'warning',
        title: 'Identifiant mobile provisoire',
        message: `L'identifiant '${identifier}' est un placeholder (com.example.*). Il devra être remplacé avant toute signature ou publication.`,
        source: 'configuration',
        fixSuggestion: "Remplacez-le par un identifiant reverse-DNS que vous contrôlez (ex: 'com.votreorg.monapp').",
      });
    }
  }

  const hasLocalDesktopRuntime =
    spec.project.type === 'desktop' && spec.frontend.tauri;

  if (spec.database.enabled && !spec.backend.enabled && !hasLocalDesktopRuntime) {
    issues.push({
      id: 'db-without-backend',
      severity: 'error',
      title: 'Base de données orpheline',
      message: 'Une base de données a été activée sans aucun service backend ou runtime local pour la piloter.',
      source: 'dependency',
      fixSuggestion: 'Activez le backend ou utilisez un runtime local compatible avec la base de données.',
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
  if (spec.authentication.enabled && spec.authentication.provider !== 'jwt') {
    issues.push({
      id: `unsupported-authentication-${spec.authentication.provider}`,
      severity: 'error',
      title: `Authentification non supportée (${spec.authentication.provider})`,
      message: `L'authentification '${spec.authentication.provider}' est demandée mais seule l'authentification JWT est actuellement disponible dans le registre Core.`,
      source: 'configuration',
      fixSuggestion: "Utilisez 'provider: jwt' ou désactivez l'authentification ('authentication.enabled: false').",
    });
  }

  return issues;
}
