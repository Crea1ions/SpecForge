/**
 * SpecForge - Project Architecture & Scaffolding Platform
 * Main Application Component
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { ProjectWizard, type OnboardingStage } from './components/ProjectWizard';
import { AboutSpecForge } from './components/AboutSpecForge';
import { SpecEditor } from './components/SpecEditor';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { FileTreeViewer } from './components/FileTreeViewer';
import { BrickLibraryViewer } from './components/BrickLibraryViewer';
import { EngineVerificationAudit } from './components/EngineVerificationAudit';
import { AiAssistModal } from './components/AiAssistModal';
import { PRESETS } from './engine/presets';
import { SpecForge, ProjectSpecification, TechnicalProfile } from './core';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

const desktopHeroImage = new URL('../assets/hero.png', import.meta.url).href;
const mobileHeroImage = new URL('../assets/hero-mobile.png', import.meta.url).href;

const AppBackground: React.FC = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;

    const smallViewport = window.matchMedia('(max-width: 767px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;

    const updateParallax = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const offset =
          smallViewport.matches || reducedMotion.matches
            ? 0
            : Math.min(window.scrollY * 0.015, 36);
        background.style.transform = `translate3d(0, ${-offset}px, 0)`;
      });
    };

    updateParallax();
    window.addEventListener('scroll', updateParallax, { passive: true });
    smallViewport.addEventListener('change', updateParallax);
    reducedMotion.addEventListener('change', updateParallax);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', updateParallax);
      smallViewport.removeEventListener('change', updateParallax);
      reducedMotion.removeEventListener('change', updateParallax);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={backgroundRef}
        className="absolute inset-x-0 -inset-y-12"
      >
        <picture className="absolute inset-0 block">
          <source media="(max-width: 767px)" srcSet={mobileHeroImage} />
          <img
            src={desktopHeroImage}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="app-background-image h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-neutral-950/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/45 via-transparent to-neutral-950/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/45 via-transparent to-neutral-950/10" />
      </div>
    </div>
  );
};

export default function App() {
  // Current active specification (Source of Truth)
  const [spec, setSpec] = useState<ProjectSpecification>(PRESETS[0].spec);
  const [currentTab, setCurrentTab] = useState<
    'wizard' | 'about' | 'spec' | 'architecture' | 'files' | 'bricks' | 'audit'
  >('wizard');
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>(-1);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Architecture Resolution (SpecForge Core Engine)
  const architecture = useMemo(() => {
    return SpecForge.resolve(spec);
  }, [spec]);

  // 2. Code & Templates Generation (SpecForge Core Engine)
  const generatedFiles = useMemo(() => {
    return SpecForge.generate(spec, architecture);
  }, [spec, architecture]);

  // Technical Profile Handler
  const handleSelectProfile = (profile: TechnicalProfile) => {
    if (profile === spec.profile) {
      return;
    }

    const preset = PRESETS.find((candidate) => candidate.spec.profile === profile);

    if (!preset) {
      showToast(`Aucun preset disponible pour le profil ${profile}.`, 'error');
      return;
    }

    setSpec(preset.spec);
  };

  // Download entire project as ZIP
  const handleDownloadZip = async () => {
    if (!architecture.isValid) {
      showToast('Impossible d\'exporter : résolvez d\'abord les conflits de compatibilité.', 'error');
      return;
    }

    try {
      setIsDownloading(true);
      const zip = new JSZip();

      // Add all generated files to zip
      generatedFiles.forEach((file) => {
        zip.file(file.path, file.content, file.encoding === 'base64' ? { base64: true } : undefined);
      });

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${spec.project.slug || 'project'}-scaffold.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Archive ${link.download} générée et téléchargée avec succès !`);
    } catch (err: any) {
      console.error('Failed to generate ZIP', err);
      showToast('Erreur lors de la création du fichier ZIP.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 font-sans text-neutral-100">
      <AppBackground />

      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-neutral-100 px-4 py-3 font-semibold text-neutral-950 focus:not-sr-only"
      >
        Passer au contenu
      </a>

      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAiAssist={() => setIsAiModalOpen(true)}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`relative z-10 w-full flex-1 ${currentTab === 'wizard' ? '' : 'mx-auto max-w-7xl px-shell pt-6'}`}
      >
        {currentTab === 'wizard' && (
          <ProjectWizard
            spec={spec}
            onChange={setSpec}
            architecture={architecture}
            onSelectProfile={handleSelectProfile}
            onboardingStage={onboardingStage}
            setOnboardingStage={setOnboardingStage}
            onDownloadZip={handleDownloadZip}
            onOpenArchitecture={() => setCurrentTab('architecture')}
            isDownloading={isDownloading}
          />
        )}

        {currentTab === 'about' && (
          <AboutSpecForge onStartProject={() => setCurrentTab('wizard')} />
        )}

        {currentTab === 'spec' && <SpecEditor spec={spec} onChange={setSpec} />}

        {currentTab === 'architecture' && (
          <ArchitectureGraph
            architecture={architecture}
            spec={spec}
            onOpenAiAnalysis={() => setIsAiModalOpen(true)}
          />
        )}

        {currentTab === 'files' && (
          <FileTreeViewer
            files={generatedFiles}
            architecture={architecture}
            onDownloadZip={handleDownloadZip}
            isDownloading={isDownloading}
          />
        )}

        {currentTab === 'bricks' && <BrickLibraryViewer architecture={architecture} />}

        {currentTab === 'audit' && (
          <EngineVerificationAudit
            spec={spec}
            architecture={architecture}
            onApplySpec={setSpec}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-800/60 bg-neutral-950/50 py-5 text-xs text-neutral-500 backdrop-blur-sm sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-shell text-center sm:flex-row sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
            <span className="font-semibold text-neutral-300">SpecForge</span>
            <span>—</span>
            <span>Specification-first, modulaire, explicite &amp; reproductible.</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Validation Déterministe
            </span>
          </div>
        </div>
      </footer>

      {/* AI Assistant Modal */}
      <AiAssistModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        spec={spec}
        architecture={architecture}
        onApplySpec={(newSpec) => {
          setSpec(newSpec);
          showToast('Spécification mise à jour par l\'assistant !');
        }}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          role={toastMessage.type === 'error' ? 'alert' : 'status'}
          aria-live={toastMessage.type === 'error' ? 'assertive' : 'polite'}
          className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3 text-xs font-medium text-neutral-100 shadow-2xl sm:bottom-6 sm:right-6"
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
}
