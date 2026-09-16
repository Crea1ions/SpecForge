import React, { useState } from 'react';
import {
  Library,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Sliders,
  Layers,
  ArrowRight,
  Shield,
  Cpu,
} from 'lucide-react';
import { SpecForge, BrickDefinition, BrickCategory, ResolvedArchitecture } from '../core';

interface BrickLibraryViewerProps {
  architecture: ResolvedArchitecture;
}

export const BrickLibraryViewer: React.FC<BrickLibraryViewerProps> = ({ architecture }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const BRICK_LIBRARY = SpecForge.registry.getAll();
  const activeIds = new Set(architecture.activeBricks.map((b) => b.id));

  const categories = [
    { id: 'all', label: 'Toutes les Briques' },
    { id: 'backend', label: 'Backend' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'database', label: 'Database' },
    { id: 'api', label: 'API' },
    { id: 'authentication', label: 'Auth' },
    { id: 'infrastructure', label: 'Infra' },
    { id: 'quality', label: 'Qualité & CI' },
    { id: 'documentation', label: 'Docs' },
  ];

  const filteredBricks = BRICK_LIBRARY.filter((b) => {
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
              Catalogue Modulaire
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {BRICK_LIBRARY.length} briques versionnées disponibles
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Bibliothèque de Briques &amp; Contrats Techniques (Section 5)
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Chaque brique déclare formellement ses capacités fournies, ses dépendances, ses incompatibilités et ses fichiers templates associés.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-400">Actives dans ce projet : </span>
            <span className="font-bold text-emerald-400">{architecture.activeBricks.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-neutral-900/40 border border-neutral-800 p-3 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une brique..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Bricks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBricks.map((brick) => {
          const isActive = activeIds.has(brick.id);

          return (
            <div
              key={brick.id}
              className={`rounded-xl border p-5 transition space-y-4 ${
                isActive
                  ? 'bg-neutral-950 border-indigo-700/80 shadow-lg shadow-indigo-950/20'
                  : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Top info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{brick.name}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                      v{brick.version}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">
                    {brick.category}
                  </span>
                </div>

                {isActive ? (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-medium shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-500 border border-neutral-800 shrink-0">
                    Inactive
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">{brick.description}</p>

              {/* Provides & Requires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-850">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1">
                    Fournit (Provides)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {brick.provides.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                      >
                        +{p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-850">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1">
                    Requiert (Requires)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {brick.requires.length > 0 ? (
                      brick.requires.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
                        >
                          &gt;{r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-neutral-500 italic">Aucun prérequis</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Files */}
              <div className="pt-2 border-t border-neutral-900">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">
                  Fichiers Templates Produits
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {brick.templateFiles.map((file) => (
                    <span
                      key={file}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
