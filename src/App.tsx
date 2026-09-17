/**
 * SpecForge - Project Architecture & Scaffolding Platform
 * Main Application Component
 */

import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { ProjectWizard } from './components/ProjectWizard';
import { SpecEditor } from './components/SpecEditor';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { FileTreeViewer } from './components/FileTreeViewer';
import { BrickLibraryViewer } from './components/BrickLibraryViewer';
import { EngineVerificationAudit } from './components/EngineVerificationAudit';
import { AiAssistModal } from './components/AiAssistModal';
import { findPreset, PRESETS } from './engine/presets';
import { SpecForge, ProjectSpecification, TechnicalProfile } from './core';
import { CheckCircle2, ShieldCheck, Terminal, Heart } from 'lucide-react';

export default function App() {
  // Current active specification (Source of Truth)
  const [spec, setSpec] = useState<ProjectSpecification>(PRESETS[0].spec);
  const [currentTab, setCurrentTab] = useState<
    'wizard' | 'spec' | 'architecture' | 'files' | 'bricks' | 'audit'
  >('wizard');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
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

    const preset = findPreset(profile, spec.template);

    if (!preset) {
      showToast(`Template "${spec.template}" indisponible pour le profil ${profile}.`);
      return;
    }

    setSpec({
      ...preset.spec,
      project: {
        ...preset.spec.project,
        ...spec.project,
        type: preset.spec.project.type,
      },
    });

    showToast(`Profil technique chargé : ${profile}`);
  };

  // Download entire project as ZIP
  const handleDownloadZip = async () => {
    if (!architecture.isValid) {
      showToast('Impossible d\'exporter : résolvez d\'abord les conflits de compatibilité.');
      return;
    }

    try {
      setIsDownloading(true);
      const zip = new JSZip();

      // Add all generated files to zip
      generatedFiles.forEach((file) => {
        zip.file(file.path, file.content);
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
      showToast('Erreur lors de la création du fichier ZIP.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        spec={spec}
        onSelectProfile={handleSelectProfile}
        architecture={architecture}
        onOpenAiAssist={() => setIsAiModalOpen(true)}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'wizard' && (
          <ProjectWizard spec={spec} onChange={setSpec} architecture={architecture} />
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
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">SpecForge</span>
            <span>—</span>
            <span>Specification-first, modulaire, explicite &amp; reproductible.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Validation Déterministe
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Rust + React Ready
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-neutral-900 border border-neutral-700 text-white text-xs font-medium rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
