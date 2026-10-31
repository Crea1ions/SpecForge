import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronUp,
  Download,
  Loader2,
} from 'lucide-react';
import { DropdownSelect } from './DropdownSelect';
import { ProjectSpecification, ResolvedArchitecture, TechnicalProfile } from '../types/spec';
import { findPreset, PRESETS } from '../engine/presets';
import { AnimatedHeading } from './AnimatedHeading';

export type OnboardingStage = -1 | 0 | 1 | 2 | 3;

interface ProjectWizardProps {
  spec: ProjectSpecification;
  onChange: (updated: ProjectSpecification) => void;
  architecture: ResolvedArchitecture;
  onSelectProfile: (profile: TechnicalProfile) => void;
  onboardingStage: OnboardingStage;
  setOnboardingStage: (stage: OnboardingStage) => void;
  onDownloadZip: () => void;
  onOpenArchitecture: () => void;
  isDownloading: boolean;
}

const profileLabels: Record<TechnicalProfile, string> = {
  rust: 'Rust',
  python: 'Python',
  typescript: 'TypeScript',
  go: 'Go',
};

export const ProjectWizard: React.FC<ProjectWizardProps> = ({
  spec,
  onChange,
  architecture,
  onSelectProfile,
  onboardingStage,
  setOnboardingStage,
  onDownloadZip,
  onOpenArchitecture,
  isDownloading,
}) => {
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateRef = useRef<HTMLElement>(null);
  const quickCreateButtonRef = useRef<HTMLButtonElement>(null);
  const profileOptions = Array.from(new Set(PRESETS.map((preset) => preset.spec.profile)));
  const templateOptions = PRESETS.filter(
    (preset, index, presets) =>
      preset.spec.profile === spec.profile &&
      presets.findIndex(
        (candidate) =>
          candidate.spec.profile === spec.profile &&
          candidate.spec.template === preset.spec.template
      ) === index
  );
  const selectedTemplate =
    templateOptions.find((preset) => preset.spec.template === spec.template)?.name ??
    spec.template;
  const errors = architecture.issues.filter((issue) => issue.severity === 'error');

  useEffect(() => {
    if (!isQuickCreateOpen || !quickCreateRef.current) return;

    const panel = quickCreateRef.current;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    panel.focus({ preventScroll: true });
  }, [isQuickCreateOpen]);

  const handleProfileChange = (profileValue: string) => {
    const profile = profileOptions.find((option) => option === profileValue);
    if (!profile) return;
    onSelectProfile(profile);
    setFlowError(null);
    setOnboardingStage(1);
  };

  const handleTemplateChange = (templateValue: string) => {
    if (!templateValue) return;

    const template = templateOptions.find(
      (option) => option.spec.template === templateValue
    )?.spec.template;
    const preset = template ? findPreset(spec.profile, template) : undefined;
    if (!preset) {
      setFlowError('Ce modèle n’est plus disponible pour ce profil. Choisissez un autre modèle.');
      return;
    }

    onChange(preset.spec);
    setFlowError(null);
    setOnboardingStage(2);
  };

  const handleProjectNameChange = (name: string) => {
    const slug =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || spec.project.slug;

    onChange({
      ...spec,
      project: {
        ...spec.project,
        name,
        slug,
      },
    });
  };

  const canContinue = spec.project.name.trim().length > 0;
  const stepCount = onboardingStage < 1 ? 1 : onboardingStage === 1 ? 2 : onboardingStage === 2 ? 3 : 4;

  const closeQuickCreate = () => {
    setIsQuickCreateOpen(false);
    window.requestAnimationFrame(() => quickCreateButtonRef.current?.focus());
  };

  const focusAfterUpdate = (id: string) => {
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const continueToGeneration = () => {
    if (!canContinue) return;
    setOnboardingStage(3);
    focusAfterUpdate('onboarding-generate-heading');
  };

  return (
    <div className="w-full pb-8">
      <section
        aria-labelledby="home-title"
        className="relative isolate flex min-h-[calc(100svh-4rem)] overflow-hidden"
      >
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-20 px-shell py-12 sm:gap-24 sm:py-16 lg:gap-32">
          <div className="max-w-2xl -translate-y-2">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-xs">
              <span className="brand-eyebrow">GÉNÉRATION DE PROJETS</span>
              <span className="brand-eyebrow-rule" aria-hidden="true" />
            </p>
            <AnimatedHeading
              as="h1"
              id="home-title"
              tone="brand"
              className="w-fit max-w-full text-[clamp(2.375rem,4.5vw,3.5rem)] font-bold leading-tight tracking-tight text-neutral-100"
              lines={[
                { text: "De l'idée à une" },
                {
                  text: 'base de code structurée.',
                  className: 'mt-1',
                  highlights: { code: 'lavender' },
                },
              ]}
            />
          </div>
          <div className="flex translate-y-4 flex-col items-start gap-5 sm:translate-y-6">
            <AnimatedHeading
              as="h2"
              tone="brand"
              className="w-fit font-mono text-2xl font-semibold text-indigo-300 sm:text-3xl"
              reverseGradient
              lines={[
                {
                  text: 'Prêt à coder.',
                  accent: true,
                },
              ]}
            />
            <button
              ref={quickCreateButtonRef}
              type="button"
              aria-expanded={isQuickCreateOpen}
              aria-controls="project-configuration"
              onClick={() => setIsQuickCreateOpen((open) => !open)}
              className="ov-button-translucent-action inline-flex items-center gap-2.5 px-5 py-3 text-sm"
            >
              {isQuickCreateOpen ? 'Masquer la création' : 'Créer mon projet'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section
        ref={quickCreateRef}
        id="project-configuration"
        aria-labelledby="configuration-title"
        tabIndex={-1}
        hidden={!isQuickCreateOpen}
        className="quick-create-reveal mx-auto w-full max-w-2xl scroll-mt-24 px-shell pb-12"
      >
        <div className="ov-panel ov-panel-translucent p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                  Création rapide
                </p>
                <h2 id="configuration-title" className="mt-1 text-lg font-semibold text-neutral-100">
                  Votre projet, en quelques choix
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">Étape {stepCount} sur 4</span>
                <button
                  type="button"
                  onClick={closeQuickCreate}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
                >
                  Fermer
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <ol className="space-y-2.5">
              <li className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-xs text-neutral-400">01</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-neutral-100">Profil technique</h3>
                      {onboardingStage >= 1 && onboardingStage !== 0 && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {profileLabels[spec.profile]}
                        </p>
                      )}
                    </div>
                  </div>
                  {onboardingStage >= 1 && onboardingStage !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingStage(0);
                        focusAfterUpdate('onboarding-profile');
                      }}
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
                    >
                      Modifier
                    </button>
                  )}
                  {onboardingStage >= 1 && onboardingStage !== 0 && (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      aria-label="Profil sélectionné"
                    />
                  )}
                </div>
                {onboardingStage <= 0 && (
                  <div className="mt-3">
                    <DropdownSelect
                      id="onboarding-profile"
                      label="Choisir un profil technique"
                      value={onboardingStage === -1 ? '' : spec.profile}
                      placeholder="Choisir un profil technique"
                      options={profileOptions.map((profile) => ({
                        value: profile,
                        label: profileLabels[profile],
                      }))}
                      onChange={(profile) => {
                        handleProfileChange(profile);
                        focusAfterUpdate('onboarding-template');
                      }}
                    />
                  </div>
                )}
              </li>

              {onboardingStage >= 1 && (
                <li className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-xs text-neutral-400">02</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-100">Modèle de projet</h3>
                        {onboardingStage >= 2 && onboardingStage !== 1 && (
                          <p className="mt-0.5 truncate text-xs text-neutral-400">
                            {selectedTemplate}
                          </p>
                        )}
                      </div>
                    </div>
                    {onboardingStage >= 2 && onboardingStage !== 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOnboardingStage(1);
                          focusAfterUpdate('onboarding-template');
                        }}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
                      >
                        Modifier
                      </button>
                    )}
                    {onboardingStage >= 2 && onboardingStage !== 1 && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-300"
                        aria-label="Modèle sélectionné"
                      />
                    )}
                  </div>
                  {onboardingStage === 1 && (
                    <div className="mt-3">
                      <DropdownSelect
                        id="onboarding-template"
                        label="Choisir un modèle de projet"
                        value=""
                        placeholder="Choisir un modèle"
                        options={templateOptions.map((preset) => ({
                          value: preset.spec.template,
                          label: `${preset.tagline} — ${preset.name}`,
                        }))}
                        onChange={(template) => {
                          handleTemplateChange(template);
                          focusAfterUpdate('onboarding-project-name');
                        }}
                        disabled={templateOptions.length === 0}
                      />
                      {templateOptions.length === 0 && (
                        <p role="status" className="mt-2 text-xs text-neutral-400">
                          Aucun modèle n’est disponible pour ce profil.
                        </p>
                      )}
                      {flowError && (
                        <p role="alert" className="mt-2 text-xs text-red-200">
                          {flowError}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )}

              {onboardingStage >= 2 && (
                <li className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-xs text-neutral-400">03</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-100">Nom du projet</h3>
                        {onboardingStage >= 3 && (
                          <p className="mt-0.5 truncate text-xs text-neutral-400">
                            {spec.project.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {onboardingStage >= 3 && (
                      <button
                        type="button"
                        onClick={() => setOnboardingStage(2)}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
                      >
                        Modifier
                      </button>
                    )}
                    {onboardingStage >= 3 && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-300"
                        aria-label="Nom de projet confirmé"
                      />
                    )}
                  </div>
                  {onboardingStage === 2 && (
                    <div className="mt-3">
                      <label htmlFor="onboarding-project-name" className="sr-only">
                        Nom du projet
                      </label>
                      <input
                        id="onboarding-project-name"
                        type="text"
                        autoComplete="off"
                        value={spec.project.name}
                        onChange={(event) => handleProjectNameChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && canContinue) {
                            event.preventDefault();
                            continueToGeneration();
                          }
                        }}
                        className="ov-field w-full rounded-lg px-3 py-2 text-sm"
                        placeholder="Ex. : Mon projet"
                        aria-describedby="project-name-help"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p id="project-name-help" className="text-xs text-neutral-400">
                          Nom suggéré par le modèle, modifiable à tout moment.
                        </p>
                        <button
                          type="button"
                          onClick={continueToGeneration}
                          disabled={!canContinue}
                          className="ov-button-secondary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          Continuer
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )}

              {onboardingStage >= 3 && (
                <li className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="pt-0.5 font-mono text-xs text-neutral-400">04</span>
                      <div>
                        <h3
                          id="onboarding-generate-heading"
                          tabIndex={-1}
                          className="text-sm font-semibold text-neutral-100"
                        >
                          Générer le projet
                        </h3>
                        {architecture.isValid ? (
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Configuration vérifiée
                            <span className="text-neutral-400">
                              {architecture.stats.totalFiles} fichiers prêts
                            </span>
                          </p>
                        ) : (
                          <div role="alert" className="mt-1 space-y-1 text-xs text-red-200">
                            <p>
                              {errors.length} problème(s) bloquent la génération.
                            </p>
                            <button
                              type="button"
                              onClick={onOpenArchitecture}
                              className="font-semibold underline underline-offset-2"
                            >
                              Voir le détail technique
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onDownloadZip}
                      disabled={!architecture.isValid || isDownloading || !canContinue}
                      aria-busy={isDownloading}
                      className="ov-button-primary inline-flex w-full shrink-0 items-center justify-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isDownloading ? 'Génération...' : 'Générer et télécharger le ZIP'}
                    </button>
                  </div>
                </li>
              )}
            </ol>
        </div>
      </section>
    </div>
  );
};
