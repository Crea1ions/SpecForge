import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 12. Quality Suite Brick
export const qualitySuiteBrick: BrickDefinition = {
  id: 'quality-suite',
  name: 'Quality, Tests & GitHub Actions CI',
  category: 'quality',
  version: '1.3.0',
  description: 'Suite automatisée de tests, formateur et pipeline GitHub Actions CI.',
  iconName: 'CheckCircle2',
  provides: ['ci_pipeline', 'linter_config', 'unit_tests'],
  requires: [],
  applies: [{ quality: { ci: true } }, { quality: { tests: true } }, { quality: { lint: true } }],
  links: [
    { from: ['rust-web-app', { category: 'backend' }, 'react-vite'], label: 'Quality Pipeline', protocol: 'GitHub Actions' },
  ],
  conflictsWith: [],
  options: [],
  templateFiles: [
    '.github/workflows/ci.yml',
    '.gitignore',
    'tests/smoke_test.rs',
    'rustfmt.toml',
    'frontend/.eslintrc.json',
  ],
  tags: ['ci', 'tests', 'github-actions'],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const gitignore = `target/
dist/
node_modules/
*.db
*.sqlite
data/*.db
data/*.db-shm
data/*.db-wal
.env
.DS_Store
`;
    files.push(
      makeFile(
        '.gitignore',
        gitignore,
        'bash',
        'quality-suite',
        'Quality, Tests & GitHub Actions CI',
        '1.3.0',
        'Exclusion des artefacts de build et données sensibles pour Git.'
      )
    );

    if (spec.quality.tests) {
      if (spec.backend.enabled && spec.backend.language === 'rust') {
        const smokeTest = `//! Smoke tests et vérification structurelle générés par SpecForge

#[test]
fn test_project_metadata() {
    let app_name = "${spec.project.name}";
    let version = "${spec.project.version}";
    assert!(!app_name.is_empty(), "Le nom du projet ne doit pas être vide");
    assert!(!version.is_empty(), "La version du projet ne doit pas être vide");
}

#[test]
fn test_server_port_configuration() {
    let port: u16 = ${spec.backend.port};
    assert!(port > 0, "Le port d'écoute configuré doit être supérieur à zéro");
}
`;
        files.push(
          makeFile(
            'tests/smoke_test.rs',
            smokeTest,
            'rust',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Smoke test unitaire et d\'intégration pour validation du contrat backend.'
          )
        );
      }
    }

    if (spec.quality.lint) {
      if (spec.backend.enabled && spec.backend.language === 'rust') {
        const rustfmt = `# Configuration du formateur et linter de style Rust (rustfmt)
edition = "2021"
max_width = 100
newline_style = "Unix"
use_small_heuristics = "Default"
`;
        files.push(
          makeFile(
            'rustfmt.toml',
            rustfmt,
            'toml',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Configuration de style et de formatage de code pour rustfmt.'
          )
        );
      }

      if (spec.frontend.enabled && spec.frontend.framework === 'react') {
        const eslintConfig = `{
  "env": {
    "browser": true,
    "es2020": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
`;
        files.push(
          makeFile(
            'frontend/.eslintrc.json',
            eslintConfig,
            'json',
            'quality-suite',
            'Quality, Tests & GitHub Actions CI',
            '1.3.0',
            'Configuration ESLint minimale pour l\'interface utilisateur React/TypeScript.'
          )
        );
      }
    }

    if (spec.quality.ci) {
      const mobileSystemDeps =
        spec.template === 'mobile'
          ? `      - name: System dependencies (Dioxus WebView)
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libasound2-dev libudev-dev libayatana-appindicator3-dev libxdo-dev libglib2.0-dev
`
          : '';
      const ci = `name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rust Toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - name: Format
        run: cargo fmt --check
${mobileSystemDeps}      - name: Tests
        run: cargo test
`;
      files.push(
        makeFile(
          '.github/workflows/ci.yml',
          ci,
          'yaml',
          'quality-suite',
          'Quality, Tests & GitHub Actions CI',
          '1.3.0',
          'Pipeline d\'intégration continue automatisé déclenché sur push et pull requests.'
        )
      );
    }

    return files;
  },
};
