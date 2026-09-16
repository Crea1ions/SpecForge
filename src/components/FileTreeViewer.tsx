import React, { useState } from 'react';
import {
  FileCode,
  Folder,
  FolderOpen,
  Copy,
  Check,
  Download,
  Search,
  HelpCircle,
  Code2,
  FileText,
  File,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { GeneratedFile, ResolvedArchitecture } from '../types/spec';

interface FileTreeViewerProps {
  files: GeneratedFile[];
  architecture: ResolvedArchitecture;
  onDownloadZip: () => void;
  isDownloading: boolean;
}

export const FileTreeViewer: React.FC<FileTreeViewerProps> = ({
  files,
  architecture,
  onDownloadZip,
  isDownloading,
}) => {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile>(files[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  // Filter files by search
  const filteredFiles = files.filter(
    (f) =>
      f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.brickName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAsciiTree = () => {
    const ascii = files.map((f) => `├── ${f.path}`).join('\n');
    navigator.clipboard.writeText(`.\n${ascii}`);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  const getFileIcon = (lang: GeneratedFile['language'], path: string) => {
    if (path.endsWith('.rs')) return <span className="text-orange-400 font-mono text-xs">🦀</span>;
    if (path.endsWith('.tsx') || path.endsWith('.ts'))
      return <span className="text-sky-400 font-mono text-xs">TS</span>;
    if (path.endsWith('.json')) return <span className="text-amber-400 font-mono text-xs">{}</span>;
    if (path.endsWith('.yaml') || path.endsWith('.yml'))
      return <span className="text-purple-400 font-mono text-xs">YM</span>;
    if (path.endsWith('.toml')) return <span className="text-emerald-400 font-mono text-xs">TO</span>;
    if (path.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-neutral-400" />;
    if (path.includes('Dockerfile')) return <Terminal className="w-3.5 h-3.5 text-blue-400" />;
    return <File className="w-3.5 h-3.5 text-neutral-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner with Stats and Download ZIP */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
              Génération Déterministe Complète
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {files.length} fichiers prêts à l'emploi
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Arborescence &amp; Inspection des Fichiers
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Inspectez chaque fichier généré, son code source complet et la justification de son existence (Traçabilité Section 9).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAsciiTree}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition"
          >
            {copiedTree ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTree ? 'Arborescence copiée !' : "Copier l'arborescence"}</span>
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Création de l\'archive...' : 'Télécharger le Projet (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Tree & Search */}
        <div className="lg:col-span-4 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer les fichiers ou briques..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* File list */}
          <div className="p-2 space-y-1 max-h-[640px] overflow-y-auto">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-950/70 border border-indigo-700/60 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    {getFileIcon(file.language, file.path)}
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 shrink-0 group-hover:text-neutral-400">
                    {Math.round(file.size / 1024 * 10) / 10} kb
                  </span>
                </button>
              );
            })}

            {filteredFiles.length === 0 && (
              <div className="p-6 text-center text-xs text-neutral-500">
                Aucun fichier ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Viewer & Traceability Banner */}
        <div className="lg:col-span-8 space-y-4">
          {selectedFile ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              {/* Traceability Header (Section 9) */}
              <div className="p-4 bg-neutral-900/80 border-b border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {selectedFile.path}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                      {selectedFile.language}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                      title="Copier le contenu du fichier"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>

                    <button
                      onClick={handleDownloadFile}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                      title="Télécharger ce fichier seul"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                </div>

                {/* Explicit Traceability Details */}
                <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-medium">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Pourquoi ce fichier existe ? (Traçabilité SpecForge)</span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    {selectedFile.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-neutral-400">
                    <span>
                      Brique génératrice :{' '}
                      <strong className="text-white font-mono">{selectedFile.brickName}</strong>{' '}
                      (v{selectedFile.brickVersion})
                    </span>
                    {selectedFile.decisionRef && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400 font-mono">
                          Décision liée : {selectedFile.decisionRef}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Code display with line numbers */}
              <div className="max-h-[520px] overflow-auto p-4 font-mono text-xs text-neutral-200 leading-relaxed">
                <pre className="flex">
                  {/* Line numbers */}
                  <div className="select-none text-neutral-600 text-right pr-4 border-r border-neutral-800/80 space-y-0.5 shrink-0">
                    {selectedFile.content.split('\n').map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  {/* Code */}
                  <code className="pl-4 whitespace-pre block overflow-x-auto text-neutral-200">
                    {selectedFile.content}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500 bg-neutral-950 border border-neutral-800 rounded-xl">
              Sélectionnez un fichier dans l'arborescence pour afficher son contenu et sa traçabilité.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
