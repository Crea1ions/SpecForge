import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, AlertCircle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import YAML from 'yaml';
import { ProjectSpecification } from '../types/spec';

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
    <div className="max-w-5xl mx-auto space-y-4 pb-16">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Source of Truth — Spécification</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Synchronisée
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Toute modification de ce fichier recalcule instantanément l'architecture et les fichiers générés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Format Switch */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setFormat('yaml')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                format === 'yaml' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              YAML
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                format === 'json' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              JSON
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter .{format}</span>
          </button>
        </div>
      </div>

      {/* Error alert if syntax error */}
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
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
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          spellCheck={false}
          className="w-full h-[580px] p-4 bg-transparent text-neutral-200 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-indigo-600/30"
        />
      </div>
    </div>
  );
};
