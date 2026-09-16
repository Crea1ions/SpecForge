import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ProjectSpecification, ResolvedArchitecture } from '../types/spec';

interface AiAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: ProjectSpecification;
  architecture: ResolvedArchitecture;
  onApplySpec: (newSpec: ProjectSpecification) => void;
}

export const AiAssistModal: React.FC<AiAssistModalProps> = ({
  isOpen,
  onClose,
  spec,
  architecture,
  onApplySpec,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposedSpec, setProposedSpec] = useState<ProjectSpecification | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [mode, setMode] = useState<'intent' | 'audit'>('intent');

  if (!isOpen) return null;

  const handleGenerateFromIntent = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim()) return;

    setLoading(true);
    setError(null);
    setProposedSpec(null);
    setRationale(null);

    try {
      const res = await fetch('/api/ai/intent-to-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend, currentSpec: spec }),
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const generated = json.data;
        const merged: ProjectSpecification = {
          ...spec,
          project: {
            ...spec.project,
            ...generated.project,
          },
          backend: {
            ...spec.backend,
            ...generated.backend,
          },
          frontend: {
            ...spec.frontend,
            ...generated.frontend,
          },
          database: {
            ...spec.database,
            ...generated.database,
          },
          api: {
            ...spec.api,
            ...generated.api,
          },
          authentication: {
            ...spec.authentication,
            ...generated.authentication,
          },
          infrastructure: {
            ...spec.infrastructure,
            ...generated.infrastructure,
          },
          quality: {
            ...spec.quality,
            ...generated.quality,
          },
          documentation: {
            ...spec.documentation,
            ...generated.documentation,
          },
        };
        setProposedSpec(merged);
        setRationale(generated.rationale || 'Spécification architecturale déduite avec succès.');
      } else {
        throw new Error('Réponse invalide du moteur.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de joindre le service d\'assistance IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditArchitecture = async () => {
    setLoading(true);
    setError(null);
    setAnalysisText(null);

    try {
      const res = await fetch('/api/ai/explain-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec,
          activeBricks: architecture.activeBricks.map((b) => b.name),
          issues: architecture.issues,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'audit');
      const data = await res.json();
      setAnalysisText(data.analysis || 'Aucune recommandation critique.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (proposedSpec) {
      onApplySpec(proposedSpec);
      onClose();
    }
  };

  const samplePrompts = [
    'Logiciel bureau d\'analyse audio natif avec cache local SQLite et Rust',
    'Microservice API REST haute performance avec Docker et PostgreSQL',
    'Application web moderne avec React 19 et backend Axum',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        {/* Modal Header */}
        <div className="p-5 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Assistant IA &amp; Conseil Architectural</h3>
              <p className="text-xs text-neutral-400">
                IA = Assistant • Moteur = Autorité technique • Utilisateur = Validation finale (Section 14)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-5 pt-3 gap-3 text-xs">
          <button
            onClick={() => setMode('intent')}
            className={`pb-3 font-medium transition border-b-2 ${
              mode === 'intent'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Description en Langage Naturel
          </button>
          <button
            onClick={() => {
              setMode('audit');
              if (!analysisText) handleAuditArchitecture();
            }}
            className={`pb-3 font-medium transition border-b-2 ${
              mode === 'audit'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Audit &amp; Explication d'Architecture
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {mode === 'intent' ? (
            <>
              <div>
                <label className="block font-medium text-neutral-300 mb-2">
                  Décrivez ce que vous souhaitez construire :
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex : Je veux créer un logiciel de bureau pour synchroniser des fichiers chiffrés avec une base SQLite et des performances Rust maximales..."
                  className="w-full h-24 p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 resize-none text-xs"
                />
              </div>

              {/* Sample prompts */}
              <div>
                <span className="text-[11px] text-neutral-500 font-medium">Exemples rapides :</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {samplePrompts.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(s);
                        handleGenerateFromIntent(s);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 transition text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Proposed Result Preview */}
              {proposedSpec && (
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-indigo-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Spécification proposée pour validation</span>
                  </div>

                  {rationale && (
                    <p className="text-neutral-300 text-xs italic bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                      "{rationale}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                    <div>
                      • Type : <strong className="text-white">{proposedSpec.project.type}</strong>
                    </div>
                    <div>
                      • Backend :{' '}
                      <strong className="text-white">
                        {proposedSpec.backend.enabled
                          ? `${proposedSpec.backend.language} (${proposedSpec.backend.framework})`
                          : 'Désactivé'}
                      </strong>
                    </div>
                    <div>
                      • Frontend :{' '}
                      <strong className="text-white">
                        {proposedSpec.frontend.enabled
                          ? `${proposedSpec.frontend.framework} ${
                              proposedSpec.frontend.tauri ? '(Desktop Tauri)' : ''
                            }`
                          : 'Désactivé'}
                      </strong>
                    </div>
                    <div>
                      • Persistance :{' '}
                      <strong className="text-white">
                        {proposedSpec.database.enabled
                          ? proposedSpec.database.type
                          : 'Désactivée'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-300">
                  Évaluation des décisions architecturales
                </span>
                <button
                  onClick={handleAuditArchitecture}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Réanalyser</span>
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-neutral-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Analyse architecturale en cours...</span>
                </div>
              ) : (
                <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl leading-relaxed text-neutral-300 whitespace-pre-line text-xs font-sans">
                  {analysisText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition"
          >
            Fermer
          </button>

          {mode === 'intent' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateFromIntent()}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-medium transition"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{loading ? 'Analyse...' : 'Déduire Spécification'}</span>
              </button>

              {proposedSpec && (
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valider &amp; Appliquer</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
