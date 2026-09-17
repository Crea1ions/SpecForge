import React from 'react';
import {
  Server,
  Layout,
  Database,
  Shield,
  Box,
  CheckSquare,
  FileText,
  Radio,
  Sliders,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { ApplicationTemplate, ProjectSpecification, ResolvedArchitecture } from '../types/spec';
import { findPreset } from '../engine/presets';

interface ProjectWizardProps {
  spec: ProjectSpecification;
  onChange: (updated: ProjectSpecification) => void;
  architecture: ResolvedArchitecture;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ spec, onChange, architecture }) => {
  const updateSpec = <K extends keyof ProjectSpecification>(
    key: K,
    val: Partial<ProjectSpecification[K]>
  ) => {
    onChange({
      ...spec,
      [key]: {
        ...spec[key],
        ...val,
      },
    });
  };

  const handleTemplateChange = (template: ApplicationTemplate) => {
    const preset = findPreset(spec.profile, template);

    if (!preset) {
      return;
    }

    onChange({
      ...preset.spec,
      project: {
        ...spec.project,
        description: preset.spec.project.description,
        type: preset.spec.project.type,
      },
    });
  };

  const errors = architecture.issues.filter((i) => i.severity === 'error');
  const warnings = architecture.issues.filter((i) => i.severity === 'warning');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Overview Banner */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                Spécification Active
              </span>
              <span className="text-xs text-neutral-400 font-mono">v{spec.specVersion}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {spec.project.name || 'Projet sans nom'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              {spec.project.description || 'Définissez les capacités requises ci-dessous. Le moteur déduit l\'architecture et les briques nécessaires.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center text-xs">
            <div className="bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800">
              <span className="text-neutral-400">Briques : </span>
              <span className="font-semibold text-white">{architecture.activeBricks.length}</span>
            </div>
            <div className="bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800">
              <span className="text-neutral-400">Fichiers : </span>
              <span className="font-semibold text-white">{architecture.stats.totalFiles}</span>
            </div>
            <div className="bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800">
              <span className="text-neutral-400">Moteur : </span>
              <span className="font-semibold text-emerald-400">Déterministe</span>
            </div>
          </div>
        </div>

        {/* Validation issues bar */}
        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 space-y-1">
            {errors.map((err) => (
              <div key={err.id} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{err.title} : </span>
                  {err.message}{' '}
                  {err.fixSuggestion && (
                    <span className="text-red-200 underline cursor-pointer">{err.fixSuggestion}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && errors.length === 0 && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 space-y-1">
            {warnings.map((warn) => (
              <div key={warn.id} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{warn.title} : </span>
                  {warn.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. Informations Générales & Type */}
      <section className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2.5 text-white font-semibold border-b border-neutral-800 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base">1. Informations Générales &amp; Type de Projet</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Nom du projet
            </label>
            <input
              type="text"
              value={spec.project.name}
              onChange={(e) => updateSpec('project', { name: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="ex: Lexi Core"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Slug technique
            </label>
            <input
              type="text"
              value={spec.project.slug}
              onChange={(e) =>
                updateSpec('project', {
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              placeholder="ex: lexi-core"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Auteur / Équipe
            </label>
            <input
              type="text"
              value={spec.project.author}
              onChange={(e) => updateSpec('project', { author: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Description de l'intention
            </label>
            <input
              type="text"
              value={spec.project.description}
              onChange={(e) => updateSpec('project', { description: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="ex: Plateforme haute performance de streaming et de traitement audio."
            />
          </div>
        </div>

        {/* Project Type Selectors */}
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-2">
            Type d'application
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'web-frontend', label: 'Web Frontend', desc: 'Client web seul' },
              { id: 'web-app', label: 'Web App', desc: 'Backend + UI Web' },
              { id: 'web-platform', label: 'Web Platform', desc: 'Frontend + Backend séparés' },
              { id: 'api-service', label: 'API Service', desc: 'Service backend pur' },
              { id: 'desktop', label: 'Desktop', desc: 'Tauri + Rust + UI' },
              { id: 'mobile', label: 'Mobile', desc: 'Application mobile' },
            ].map((t) => {
              const template = t.id as ApplicationTemplate;
              const preset = findPreset(spec.profile, template);
              const isActive = spec.template === template;
              const isAvailable = !!preset;

              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => handleTemplateChange(template)}
                  className={`p-3 rounded-lg border text-left transition ${
                    isActive
                      ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                      : isAvailable
                        ? 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        : 'bg-neutral-950/30 border-neutral-900 text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{t.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                    {isAvailable ? t.desc : 'Template non disponible'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Backend & Frontend Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Card */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Server className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm">Backend Service</h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={spec.backend.enabled}
                onChange={(e) => updateSpec('backend', { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {spec.backend.enabled ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Langage &amp; Runtime</label>
                <select
                  value={spec.backend.language}
                  onChange={(e) =>
                    updateSpec('backend', {
                      language: e.target.value as any,
                      framework: e.target.value === 'rust' ? 'axum' : 'fastapi',
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="rust">Rust (Tokio, mémoire garantie, binaire ultra-rapide)</option>
                  <option value="python">Python (FastAPI, Asyncio, écosystème IA/Data)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Framework Web</label>
                <select
                  value={spec.backend.framework}
                  onChange={(e) => updateSpec('backend', { framework: e.target.value as any })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {spec.backend.language === 'rust' ? (
                    <option value="axum">Axum (Recommandé par la communauté Tokio)</option>
                  ) : (
                    <option value="fastapi">FastAPI (Typage strict Pydantic + OpenAPI)</option>
                  )}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-neutral-400 mb-1">Port HTTP</label>
                  <input
                    type="number"
                    value={spec.backend.port}
                    onChange={(e) => updateSpec('backend', { port: parseInt(e.target.value) || 8080 })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="cors"
                    checked={spec.backend.cors}
                    onChange={(e) => updateSpec('backend', { cors: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="cors" className="text-neutral-300 cursor-pointer">
                    CORS permissif
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">
              Service backend désactivé dans cette cible de génération.
            </p>
          )}
        </div>

        {/* Frontend Card */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Layout className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm">Interface Utilisateur</h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={spec.frontend.enabled}
                onChange={(e) => updateSpec('frontend', { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {spec.frontend.enabled ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Framework &amp; Bundler</label>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white flex items-center justify-between">
                  <span>React 19 + Vite (TypeScript)</span>
                  <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800/40">
                    SPA Native
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Système de styles</label>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white flex items-center justify-between">
                  <span>Tailwind CSS v4 (Utilitaires optimisés)</span>
                  <span className="text-emerald-400 text-xs">Activé</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800/60">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spec.frontend.tauri}
                    disabled={spec.project.type !== 'desktop'}
                    onChange={(e) => updateSpec('frontend', { tauri: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-sky-600 focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div>
                    <span className="text-white font-medium">Empaquetage Bureau Tauri</span>
                    <p className="text-[11px] text-neutral-400">
                      Génère la couche native `src-tauri` pour exécuter l'UI dans une fenêtre OS légère.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">
              Interface utilisateur non incluse dans cette configuration.
            </p>
          )}
        </div>
      </div>

      {/* 3. Base de données & API */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Card */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Database className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm">Base de données &amp; Stockage</h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={spec.database.enabled}
                onChange={(e) => updateSpec('database', { enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {spec.database.enabled ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Moteur Relationnel</label>
                <select
                  value={spec.database.type}
                  onChange={(e) =>
                    updateSpec('database', {
                      type: e.target.value as any,
                      orm: 'sqlx',
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="sqlite">SQLite (Embarqué, zéro-configuration, fichier local)</option>
                  <option value="postgresql">PostgreSQL (Production, forte charge, Docker compose)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Couche d'Accès aux Données</label>
                <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200">
                  {spec.database.type === 'sqlite' ? (
                    <span>Rusqlite &amp; SQLx vérifié au compile-time</span>
                  ) : (
                    <span>SQLx avec connection pool asynchrone</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-neutral-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Migrations SQL incluses</span>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">
              Aucun stockage de données persistant configuré.
            </p>
          )}
        </div>

        {/* API & Auth Card */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-3">
            <Shield className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm">Protocole API &amp; Authentification</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Style d'API</label>
              <select
                value={spec.api.style}
                onChange={(e) => updateSpec('api', { style: e.target.value as any })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="rest">REST API (Endpoints JSON, pagination, handlers CRUD)</option>
                <option value="websocket">WebSocket (Diffusion temps réel &amp; messages)</option>
                <option value="none">Aucune API (CLI / Traitement batch)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-neutral-800/60">
              <label className="flex items-center justify-between cursor-pointer mb-2">
                <span className="text-neutral-300 font-medium">Authentification JWT</span>
                <input
                  type="checkbox"
                  checked={spec.authentication.enabled}
                  onChange={(e) =>
                    updateSpec('authentication', {
                      enabled: e.target.checked,
                      provider: e.target.checked ? 'jwt' : 'none',
                    })
                  }
                  className="rounded bg-neutral-900 border-neutral-700 text-purple-600 focus:ring-0"
                />
              </label>
              <p className="text-[11px] text-neutral-400">
                Active le middleware de vérification de Bearer tokens et la signature cryptographique.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Infrastructure & DevOps */}
      <section className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-3">
          <Box className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm">Infrastructure &amp; Déploiement</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition ${
              spec.infrastructure.docker
                ? 'bg-blue-950/40 border-blue-700 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">Docker Multi-Stage</span>
              <input
                type="checkbox"
                checked={spec.infrastructure.docker}
                onChange={(e) =>
                  updateSpec('infrastructure', {
                    docker: e.target.checked,
                    compose: e.target.checked ? spec.infrastructure.compose : false,
                  })
                }
                className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0"
              />
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Génère le Dockerfile optimisé Alpine pour un runtime minimal.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition ${
              spec.infrastructure.compose
                ? 'bg-blue-950/40 border-blue-700 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">Docker Compose</span>
              <input
                type="checkbox"
                disabled={!spec.infrastructure.docker}
                checked={spec.infrastructure.compose}
                onChange={(e) => updateSpec('infrastructure', { compose: e.target.checked })}
                className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0"
              />
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Orchestre le backend et la base PostgreSQL en une commande.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition ${
              spec.infrastructure.systemd
                ? 'bg-blue-950/40 border-blue-700 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">Service Linux systemd</span>
              <input
                type="checkbox"
                checked={spec.infrastructure.systemd}
                onChange={(e) => updateSpec('infrastructure', { systemd: e.target.checked })}
                className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0"
              />
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Fichier d'unité pour déploiement direct bare-metal sur VPS.
            </p>
          </label>
        </div>
      </section>

      {/* 5. Qualité, CI & Documentation */}
      <section className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-3">
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm">Assurance Qualité &amp; Documentation (Section 10)</h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { key: 'tests', label: 'Tests Unitaires & Intégration', category: 'quality' },
            { key: 'ci', label: 'GitHub Actions CI', category: 'quality' },
            { key: 'readme', label: 'README.md', category: 'documentation' },
          ].map((item) => {
            const isQuality = item.category === 'quality';
            const isChecked = isQuality
              ? (spec.quality as any)[item.key]
              : (spec.documentation as any)[item.key];

            return (
              <label
                key={item.key}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                }`}
              >
                <span className="font-medium text-[11px] leading-tight pr-2">{item.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(isChecked)}
                  onChange={(e) => {
                    if (isQuality) {
                      updateSpec('quality', { [item.key]: e.target.checked });
                    } else {
                      updateSpec('documentation', { [item.key]: e.target.checked });
                    }
                  }}
                  className="rounded bg-neutral-900 border-neutral-700 text-indigo-600 focus:ring-0 shrink-0"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
};
