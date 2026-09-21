import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 14. Project Work Structure Brick
export const workStructureBrick: BrickDefinition = {
  id: 'work-structure',
  name: 'Project Work Structure',
  category: 'documentation',
  version: '1.0.0',
  description: 'Squelette documentaire de suivi de projet, avec des fichiers guides prêts à être complétés par le développeur.',
  iconName: 'FolderTree',
  provides: ['project_work_structure'],
  requires: [],
  compatibleWith: [],
  conflictsWith: [],
  options: [],
  templateFiles: [
    'work/00-README.md',
    'work/01-VISION/Fiche-Produit.md',
    'work/01-VISION/Principes.md',
    'work/01-VISION/Vision.md',
    'work/02-ROADMAP/Roadmap.md',
    'work/03-ARCHITECTURE/Architecture.md',
    'work/03-ARCHITECTURE/Backend.md',
    'work/03-ARCHITECTURE/Frontend.md',
    'work/03-ARCHITECTURE/Securite.md',
    'work/04-ISSUES/Decisions.md',
    'work/04-ISSUES/Issues.md',
    'work/04-ISSUES/Issues-Recurrentes.md',
    'work/04-ISSUES/Points-En-Suspens.md',
    'work/05-SESSIONS/Suivi-Sessions.md',
    'work/05-SESSIONS/TODOs.md',
    'work/06-TESTS/Tests-Manuels.md',
    'work/06-TESTS/Tests-Techniques.md',
    'work/09-NOTES-PREP/README.md',
    'work/CHANGELOG.md',
  ],
  tags: ['docs', 'work', 'project-management'],

  generateFiles: () => {
    const files: GeneratedFile[] = [];

    const documents: Array<[string, string]> = [
      [
        'work/00-README.md',
        `# Work

## Rôle du dossier

Ce dossier peut servir à organiser le suivi documentaire du projet.

Il propose une structure de travail destinée à être adaptée et complétée
par le développeur au fil de l'évolution du projet.
`,
      ],
      [
        'work/01-VISION/Fiche-Produit.md',
        `# Fiche Produit

## Rôle du document

Ce document peut servir à présenter le produit de manière synthétique :
son objectif, son public cible, ses fonctionnalités principales et son périmètre.
`,
      ],
      [
        'work/01-VISION/Principes.md',
        `# Principes

## Rôle du document

Ce document peut servir à formaliser les principes directeurs du projet :
règles de conception, contraintes importantes et choix fondamentaux.
`,
      ],
      [
        'work/01-VISION/Vision.md',
        `# Vision

## Rôle du document

Ce document peut servir à décrire la vision globale du projet,
sa finalité, ses objectifs et sa direction à long terme.
`,
      ],
      [
        'work/02-ROADMAP/Roadmap.md',
        `# Roadmap

## Rôle du document

Ce document peut servir à suivre les grandes étapes prévues du projet,
les évolutions envisagées et leur progression.
`,
      ],
      [
        'work/03-ARCHITECTURE/Architecture.md',
        `# Architecture

## Rôle du document

Ce document peut servir à décrire l'architecture générale du projet,
ses principaux composants et leurs relations.
`,
      ],
      [
        'work/03-ARCHITECTURE/Backend.md',
        `# Backend

## Rôle du document

Ce document peut servir à documenter l'organisation du backend,
ses composants, ses responsabilités et ses choix techniques spécifiques.
`,
      ],
      [
        'work/03-ARCHITECTURE/Frontend.md',
        `# Frontend

## Rôle du document

Ce document peut servir à documenter l'organisation du frontend,
ses composants, ses responsabilités et ses choix techniques spécifiques.
`,
      ],
      [
        'work/03-ARCHITECTURE/Securite.md',
        `# Sécurité

## Rôle du document

Ce document peut servir à centraliser les principes, contraintes,
mesures et décisions relatives à la sécurité du projet.
`,
      ],
      [
        'work/04-ISSUES/Decisions.md',
        `# Decisions

## Rôle du document

Ce document peut servir à conserver les décisions importantes prises
pendant le développement ainsi que leur contexte et leurs conséquences.
`,
      ],
      [
        'work/04-ISSUES/Issues.md',
        `# Issues

## Rôle du document

Ce document peut servir à suivre les problèmes, anomalies ou difficultés
identifiés pendant le développement et leur état de résolution.
`,
      ],
      [
        'work/04-ISSUES/Issues-Recurrentes.md',
        `# Issues Récurrentes

## Rôle du document

Ce document peut servir à suivre les problèmes qui apparaissent
régulièrement et à documenter leurs causes ou solutions connues.
`,
      ],
      [
        'work/04-ISSUES/Points-En-Suspens.md',
        `# Points En Suspens

## Rôle du document

Ce document peut servir à conserver les questions ouvertes,
incertitudes et sujets nécessitant encore une décision.
`,
      ],
      [
        'work/05-SESSIONS/Suivi-Sessions.md',
        `# Suivi des Sessions

## Rôle du document

Ce document peut servir à suivre les différentes sessions de développement,
leur état, leurs objectifs et leurs résultats.
`,
      ],
      [
        'work/05-SESSIONS/TODOs.md',
        `# TODOs

## Rôle du document

Ce document peut servir à centraliser les tâches restantes,
actions à effectuer et éléments à traiter ultérieurement.
`,
      ],
      [
        'work/06-TESTS/Tests-Manuels.md',
        `# Tests Manuels

## Rôle du document

Ce document peut servir à décrire les scénarios de test effectués manuellement,
leurs résultats et les éventuels problèmes constatés.
`,
      ],
      [
        'work/06-TESTS/Tests-Techniques.md',
        `# Tests Techniques

## Rôle du document

Ce document peut servir à documenter les tests techniques,
leur couverture, leurs résultats et les problèmes détectés.
`,
      ],
      [
        'work/09-NOTES-PREP/README.md',
        `# Notes de Préparation

## Rôle du dossier

Ce dossier peut servir à conserver les notes, réflexions et préparations
temporaires qui ne sont pas encore intégrées à la documentation principale.
`,
      ],
      [
        'work/CHANGELOG.md',
        `# Changelog

## Rôle du document

Ce document peut servir à conserver l'historique des évolutions
significatives du projet.
`,
      ],
    ];

    for (const [path, content] of documents) {
      files.push(
        makeFile(
          path,
          content,
          'markdown',
          'work-structure',
          'Project Work Structure',
          '1.0.0',
          'Squelette documentaire proposé par SpecForge.'
        )
      );
    }

    return files;
  },
};
