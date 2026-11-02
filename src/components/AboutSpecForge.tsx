import React from 'react';
import { ArrowRight, FileCode2, GitGraph, ShieldCheck } from 'lucide-react';
import { PageHero } from './PageHero';

interface AboutSpecForgeProps {
  onStartProject: () => void;
}

export const AboutSpecForge: React.FC<AboutSpecForgeProps> = ({ onStartProject }) => (
  <div className="mx-auto max-w-6xl space-y-10 pb-16">
    <PageHero
      eyebrow="DÉCOUVRIR SPECFORGE"
      tone="plum"
      title="Ne repartez pas de zéro."
      accent="Construisez sur du solide."
      description="Structure, dépendances, configuration et premiers choix reviennent souvent d’un projet à l’autre. SpecForge assemble ces fondations en une base cohérente, pour vous laisser vous concentrer sur ce qui rend votre produit unique."
      actions={
        <button
          type="button"
          onClick={onStartProject}
          className="ov-button-primary flex w-full items-center justify-center gap-2 px-5 py-3 text-sm sm:w-auto"
        >
          Créer un projet
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    />

    <section aria-labelledby="specforge-flow-title" className="space-y-6">
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
          LE FLUX DU CORE
        </p>
        <h2 id="specforge-flow-title" className="mt-3 text-2xl font-bold text-neutral-100 sm:text-3xl">
          De l’intention à une base prête à reprendre.
        </h2>
        <p className="mt-3 text-sm leading-7 text-neutral-300 sm:text-base">
          Vous choisissez un profil et un modèle disponibles. La configuration devient une spécification — la référence unique du Core — indépendante de l’interface et de l’IA.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-3">
        <li className="rounded-2xl border border-neutral-800/80 bg-neutral-950/45 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold tracking-wider text-indigo-300">
              01 / VALIDATE
            </span>
            <ShieldCheck className="h-5 w-5 text-indigo-300" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-neutral-100">Valider</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Le Validator vérifie la cohérence de la spécification et le support des capacités demandées. Dépendances manquantes et incompatibilités sont signalées avant l’export.
          </p>
        </li>

        <li className="rounded-2xl border border-neutral-800/80 bg-neutral-950/45 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold tracking-wider text-indigo-300">
              02 / RESOLVE
            </span>
            <GitGraph className="h-5 w-5 text-indigo-300" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-neutral-100">Résoudre</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Le Resolver combine capacités, dépendances et compatibilités des briques pour déterminer les composants actifs et une architecture adaptée.
          </p>
        </li>

        <li className="rounded-2xl border border-neutral-800/80 bg-neutral-950/45 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold tracking-wider text-orange-300">
              03 / GENERATE
            </span>
            <FileCode2 className="h-5 w-5 text-orange-300" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-neutral-100">Générer</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Le Generator produit les fichiers à partir de l’architecture résolue. À spécification et briques identiques, le résultat reste reproductible ; vous pouvez l’inspecter avant de télécharger le ZIP.
          </p>
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 border-indigo-500/50 pl-4 text-xs sm:gap-x-4 sm:pl-5">
        <span className="font-mono text-neutral-200">INTENTION</span>
        <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
        <span className="font-mono text-indigo-300">PROJECTSPECIFICATION</span>
        <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
        <span className="font-mono text-indigo-300">ARCHITECTURE</span>
        <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
        <span className="font-mono text-orange-300">FICHIERS + ZIP</span>
      </div>
    </section>

    <section
      className="grid gap-8 border-t border-neutral-800/70 pt-8 md:grid-cols-2"
    >
      <article>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
          LE LIVRABLE
        </p>
        <h2 className="mt-3 text-xl font-bold text-neutral-100 sm:text-2xl">
          Une fondation, pas un produit fini.
        </h2>
        <p className="mt-3 text-sm leading-7 text-neutral-300 sm:text-base">
          Le squelette fournit une architecture initiale, des répertoires, des configurations, du code et de la documentation pour démarrer. Vous restez libre de le modifier : il continue d’évoluer sans dépendre de SpecForge.
        </p>
      </article>

      <article className="border-l-2 border-indigo-500/50 pl-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
          L’ASSISTANT IA
        </p>
        <h2 className="mt-3 text-xl font-bold text-neutral-100 sm:text-2xl">
          Il propose. Le Core décide.
        </h2>
        <p className="mt-3 text-sm leading-7 text-neutral-300 sm:text-base">
          L’IA peut aider à formaliser une intention ou expliquer une architecture. Ses suggestions restent des propositions : vous les validez, puis le Core applique les règles et prend les décisions techniques.
        </p>
      </article>
    </section>
  </div>
);
