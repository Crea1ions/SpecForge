/**
 * SpecForge Core - Project Generator
 * 
 * Orchestrates code generation across resolved active bricks:
 * - Emits canonical Source of Truth (`project.yaml`)
 * - Strictly enforces architectural validity (blocks generation when errors exist)
 * - Invokes autonomous brick plugins to generate files
 * - Attaches end-to-end traceability metadata to every file
 * 
 * Free of UI and framework dependencies.
 */

import { ProjectSpecification, GeneratedFile, ResolvedArchitecture, GenerationContext } from './types';
import { BrickRegistry, defaultRegistry } from './registry';
import { resolveArchitecture } from './resolver';
import { getContentByteLength } from './utils';
import YAML from 'yaml';

function renderMarkdown(value: unknown, level = 1): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          return `- ${renderMarkdown(item, level + 1).trim()}`;
        }

        return `- ${String(item)}`;
      })
      .join('\n');
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const simpleEntries = entries.filter(
    ([, entry]) =>
      entry === null ||
      entry === undefined ||
      typeof entry !== 'object',
  );
  const complexEntries = entries.filter(
    ([, entry]) => entry !== null && typeof entry === 'object',
  );

  let markdown = '';

  if (simpleEntries.length > 0) {
    markdown += '| Propriété | Valeur |\n';
    markdown += '|---|---|\n';

    for (const [key, entry] of simpleEntries) {
      markdown += `| ${key} | ${String(entry)} |\n`;
    }
  }

  for (const [key, entry] of complexEntries) {
    markdown += `\n${'#'.repeat(level)} ${key}\n\n`;
    markdown += renderMarkdown(entry, level + 1);
    markdown += '\n';
  }

  return markdown.trim();
}

export function generateProjectFiles(
  spec: ProjectSpecification,
  architecture?: ResolvedArchitecture,
  registry: BrickRegistry = defaultRegistry
): GeneratedFile[] {
  // Auto-resolve architecture if not pre-computed
  const resolved = architecture ?? resolveArchitecture(spec, registry);

  // STRICT CONSTRAINT: If architecture has blocking errors, do not generate source code
  if (!resolved.isValid) {
    const errorMessages = resolved.issues
      .filter((i) => i.severity === 'error')
      .map((i) => `- [${i.source.toUpperCase()}] ${i.title}: ${i.message}`)
      .join('\n');

    const blockedFileContent = `# ⛔ GÉNÉRATION BLOQUÉE PAR LE MOTEUR D'ARCHITECTURE SPECFORGE

Le moteur de validation déterministe a refusé la génération de code pour cette spécification.
Des dépendances obligatoires ne sont pas satisfaites ou des conflits d'architecture ont été détectés :

${errorMessages}

## Résolution requise :
Corrigez la spécification 'project.yaml' ou modifiez les options dans le Wizard pour lever les conflits.
`;

    const yamlStr = YAML.stringify(spec, { indent: 2 });

    return [
      {
        path: 'ERROR_GENERATION_BLOCKED.md',
        content: blockedFileContent,
        language: 'markdown',
        size: getContentByteLength(blockedFileContent),
        brickId: 'core-validator',
        brickName: 'SpecForge Validation Engine',
        brickVersion: '1.0.0',
        reason: 'Rapport d\'arrêt strict émis suite à des violations de compatibilité ou dépendances manquantes.',
      },
      {
        path: 'project.yaml',
        content: yamlStr,
        language: 'yaml',
        size: getContentByteLength(yamlStr),
        brickId: 'core-engine',
        brickName: 'SpecForge Core Engine',
        brickVersion: '1.0.0',
        reason: 'Spécification source de vérité ayant provoqué le diagnostic d\'incompatibilité.',
        decisionRef: 'SPEC-ROOT',
      },
    ];
  }

  const files: GeneratedFile[] = [];

  // 1. Emit Source of Truth (project.yaml)
  const yamlContent = `# ==============================================================================
# SpecForge - Source of Truth Project Specification
# Specification Version: ${spec.specVersion}
# This specification defines the architecture, components, and generator rules.
# ==============================================================================

${YAML.stringify(spec, { indent: 2 })}`;

  files.push({
    path: 'project.yaml',
    content: yamlContent,
    language: 'yaml',
    size: getContentByteLength(yamlContent),
    brickId: 'core-engine',
    brickName: 'SpecForge Core Engine',
    brickVersion: '1.0.0',
    reason: 'Source de vérité absolue (Source of Truth) décrivant l\'ensemble des besoins et configurations du projet.',
    decisionRef: 'SPEC-ROOT',
  });

  // 2. Emit readable Markdown representation of the canonical specification
  const markdownContent = `# Project Specification

${renderMarkdown(spec, 2)}
`;

  files.push({
    path: 'project.md',
    content: markdownContent,
    language: 'markdown',
    size: getContentByteLength(markdownContent),
    brickId: 'core-engine',
    brickName: 'SpecForge Core Engine',
    brickVersion: '1.0.0',
    reason: 'Représentation Markdown de la spécification canonique.',
    decisionRef: 'SPEC-ROOT',
  });

  // 3. Generation Context passed to bricks
  const ctx: GenerationContext = {
    spec,
    activeBricks: resolved.activeBricks,
    decisions: resolved.decisions,
  };

  // 3. Invoke each autonomous brick plugin
  for (const brick of resolved.activeBricks) {
    if (typeof brick.generateFiles === 'function') {
      try {
        const brickFiles = brick.generateFiles(ctx);
        files.push(...brickFiles);
      } catch (err) {
        console.error(`Erreur dans le générateur de la brique ${brick.id}:`, err);
      }
    }
  }

  return files;
}
