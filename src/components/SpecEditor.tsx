import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, AlertCircle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import YAML from 'yaml';
import { ProjectSpecification } from '../types/spec';
import { PageHero } from './PageHero';

interface SpecEditorProps {
  spec: ProjectSpecification;
  onChange: (updated: ProjectSpecification) => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onChange }) => {
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync state whenever spec changes from outside
  useEffect(() => {
    try {
      if (format === 'yaml') {
        setText(YAML.stringify(spec, { indent: 2 }));
      } else {
        setText(JSON.stringify(spec, null, 2));
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
    }
  }, [spec, format]);

  const handleTextChange = (newVal: string) => {
    setText(newVal);
    try {
      let parsed: any;
      if (format === 'yaml') {
        parsed = YAML.parse(newVal);
      } else {
        parsed = JSON.parse(newVal);
      }

      if (parsed && typeof parsed === 'object' && parsed.project && parsed.backend) {
        setError(null);
        onChange(parsed as ProjectSpecification);
      } else {
        setError("Structure de spécification invalide (doit contenir au minimum les clés 'project' et 'backend').");
      }
    } catch (err: any) {
      setError(`Erreur de syntaxe ${format.toUpperCase()} : ${err.message}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = format === 'yaml' ? 'project.yaml' : 'project.json';
    const mime = format === 'yaml' ? 'text/yaml' : 'application/json';
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <PageHero
        eyebrow="SOURCE DE VÉRITÉ"
        tone="cyan"
        title="Spécification du projet"
        accent="YAML / JSON"
        description="Toute modification du fichier recalcule instantanément l’architecture et les fichiers générés."
        meta={
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800/40 bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
              <CheckCircle2 className="w-3 h-3" /> Synchronisée
          </span>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/45 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Format
          </span>
          {/* Format Switch */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setFormat('yaml')}
              aria-pressed={format === 'yaml'}
              className={`px-3 py-1 rounded-md font-medium transition ${
                format === 'yaml' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              YAML
            </button>
            <button
              onClick={() => setFormat('json')}
              aria-pressed={format === 'json'}
              className={`px-3 py-1 rounded-md font-medium transition ${
                format === 'json' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={handleCopy}
            className="ov-button-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            className="ov-button-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter .{format}</span>
          </button>
        </div>
      </div>

      {/* Error alert if syntax error */}
      {error && (
        <div role="alert" className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor Area */}
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-neutral-800 text-xs text-neutral-400 font-mono">
          <span>{format === 'yaml' ? 'project.yaml' : 'project.json'}</span>
          <span>UTF-8 • {text.split('\n').length} lignes</span>
        </div>
        <textarea
          aria-label={`Contenu de la spécification au format ${format.toUpperCase()}`}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          spellCheck={false}
          className="w-full h-[580px] p-4 bg-transparent text-neutral-200 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-indigo-600/30"
        />
      </div>
    </div>
  );
};
