import React, { useState } from 'react';
import {
  GitGraph,
  ArrowRight,
  Server,
  Layout,
  Database,
  ShieldCheck,
  Box,
  CheckCircle2,
  FileCode2,
  BookOpen,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ResolvedArchitecture, ProjectSpecification, ArchitectureNode } from '../types/spec';

interface ArchitectureGraphProps {
  architecture: ResolvedArchitecture;
  spec: ProjectSpecification;
  onOpenAiAnalysis: () => void;
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({
  architecture,
  spec,
  onOpenAiAnalysis,
}) => {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    architecture.nodes[0] || null
  );

  const getLayerColor = (layer: ArchitectureNode['layer']) => {
    switch (layer) {
      case 'client':
        return 'border-sky-700 bg-sky-950/40 text-sky-300';
      case 'gateway':
        return 'border-indigo-700 bg-indigo-950/40 text-indigo-300';
      case 'app':
        return 'border-emerald-700 bg-emerald-950/40 text-emerald-300';
      case 'data':
        return 'border-amber-700 bg-amber-950/40 text-amber-300';
      case 'ops':
        return 'border-purple-700 bg-purple-950/40 text-purple-300';
      default:
        return 'border-neutral-700 bg-neutral-900 text-neutral-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header with quick stats */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
              Résolution Déterministe
            </span>
            <span className="text-xs text-neutral-400">
              {architecture.nodes.length} composants interconnectés
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Graphe d'Architecture &amp; Registre des Décisions
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Visualisation des frontières logiques, protocoles d'échange et décisions architecturales déduites de votre spécification.
          </p>
        </div>

        <button
          onClick={onOpenAiAnalysis}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition self-start md:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Audit Architectural IA</span>
        </button>
      </div>

      {/* Visual Component Pipeline / Graph */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 space-y-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitGraph className="w-4 h-4 text-indigo-400" />
          Pipeline Applicatif Résolu
        </h3>

        {/* Nodes Grid / Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {architecture.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-xl border cursor-pointer transition relative ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-500 bg-neutral-900'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getLayerColor(
                      node.layer
                    )}`}
                  >
                    {node.layer}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="font-semibold text-sm text-white">{node.name}</div>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{node.description}</p>

                <div className="mt-3 pt-2.5 border-t border-neutral-900 flex flex-wrap gap-1">
                  {node.technologies.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Connected Protocols & Edges */}
        {architecture.edges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Contrats d'échange &amp; Protocoles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {architecture.edges.map((edge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                >
                  <span className="font-medium text-neutral-200">
                    {architecture.nodes.find((n) => n.id === edge.from)?.name || edge.from}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-medium text-neutral-200">
                    {architecture.nodes.find((n) => n.id === edge.to)?.name || edge.to}
                  </span>
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-indigo-300">
                    {edge.protocol || edge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-white">
                Détail du composant : {selectedNode.name}
              </h4>
            </div>
            <span className="text-xs font-mono text-neutral-400 uppercase">
              Couche [{selectedNode.layer}]
            </span>
          </div>
          <p className="text-xs text-neutral-300">{selectedNode.description}</p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <span className="text-xs text-neutral-400">Technologies :</span>
            {selectedNode.technologies.map((tech) => (
              <span
                key={tech}
                className="text-xs font-mono bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-indigo-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Architectural Decisions Records (ADRs) */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-3">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base">
            Décisions Architecturales Déduites (ADR - Section 10)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architecture.decisions.map((adr) => (
            <div
              key={adr.id}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">{adr.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-semibold">
                  {adr.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">{adr.title}</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">{adr.decision}</p>

              <div className="pt-2 border-t border-neutral-900 text-xs">
                <span className="text-neutral-500 font-medium">Conséquences :</span>
                <ul className="list-disc list-inside text-neutral-400 text-[11px] mt-1 space-y-0.5">
                  {adr.consequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
