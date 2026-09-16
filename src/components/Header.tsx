import React from 'react';
import {
  Boxes,
  Code2,
  FileCode,
  GitGraph,
  Library,
  Download,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { PRESETS } from '../engine/presets';
import { ProjectSpecification, ResolvedArchitecture } from '../types/spec';

interface HeaderProps {
  currentTab: 'wizard' | 'spec' | 'architecture' | 'files' | 'bricks' | 'audit';
  setCurrentTab: (tab: 'wizard' | 'spec' | 'architecture' | 'files' | 'bricks' | 'audit') => void;
  spec: ProjectSpecification;
  onSelectPreset: (presetId: string) => void;
  architecture: ResolvedArchitecture;
  onOpenAiAssist: () => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  spec,
  onSelectPreset,
  architecture,
  onOpenAiAssist,
  onDownloadZip,
  isDownloading,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">SpecForge</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  v1.0 Core
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Plateforme d'Architecture &amp; Scaffolding
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-900/80 p-1 rounded-lg border border-neutral-800 text-xs font-medium">
            <button
              onClick={() => setCurrentTab('wizard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                currentTab === 'wizard'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Concepteur
            </button>

            <button
              onClick={() => setCurrentTab('spec')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                currentTab === 'spec'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Spécification
            </button>

            <button
              onClick={() => setCurrentTab('architecture')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                currentTab === 'architecture'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <GitGraph className="w-3.5 h-3.5" />
              Architecture
            </button>

            <button
              onClick={() => setCurrentTab('files')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition relative ${
                currentTab === 'files'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Génération
              <span className="ml-1 px-1.5 py-0.2 bg-neutral-700 text-neutral-300 rounded-full text-[10px]">
                {architecture.stats.totalFiles}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('bricks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                currentTab === 'bricks'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              Briques
            </button>

            <button
              onClick={() => setCurrentTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                currentTab === 'audit'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-emerald-800/40'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Audit (12 Tests)
            </button>
          </nav>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Presets Select */}
            <div className="relative hidden lg:block">
              <select
                onChange={(e) => onSelectPreset(e.target.value)}
                defaultValue=""
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-700 cursor-pointer"
              >
                <option value="" disabled>
                  Modèles cibles...
                </option>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.badge})
                  </option>
                ))}
              </select>
            </div>

            {/* AI Assistant Button */}
            <button
              onClick={onOpenAiAssist}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-950/70 border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/80 transition"
              title="Générer une spécification depuis une intention en langage naturel"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Assistant IA</span>
            </button>

            {/* Status Health Indicator */}
            <div
              onClick={() => setCurrentTab('architecture')}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                architecture.isValid
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
              }`}
            >
              {architecture.isValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cohérent ({architecture.activeBricks.length} briques)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {architecture.issues.filter((i) => i.severity === 'error').length} conflit(s)
                  </span>
                </>
              )}
            </div>

            {/* Download Zip CTA */}
            <button
              onClick={onDownloadZip}
              disabled={isDownloading || !architecture.isValid}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-sm shadow-indigo-600/30 transition"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span className="whitespace-nowrap">
                {isDownloading ? 'Génération...' : 'Télécharger (.ZIP)'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-neutral-900 gap-2">
          {(['wizard', 'spec', 'architecture', 'files', 'bricks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap capitalize font-medium ${
                currentTab === tab
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab === 'wizard' ? 'Concepteur' : tab === 'files' ? 'Génération' : tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
