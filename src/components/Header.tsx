import React, { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileCode,
  GitGraph,
  Home,
  Library,
  Sparkles,
} from 'lucide-react';

type AppTab = 'wizard' | 'about' | 'spec' | 'architecture' | 'files' | 'bricks' | 'audit';
const logo = new URL('../../assets/logo.png', import.meta.url).href;

interface HeaderProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  onOpenAiAssist: () => void;
}

const navigationItems: {
  id: Exclude<AppTab, 'wizard'>;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'about',
    label: 'Comprendre SpecForge',
    description: 'Le flux et le moteur, simplement',
    icon: BookOpen,
  },
  {
    id: 'spec',
    label: 'Spécification',
    description: 'Configurer les options détaillées',
    icon: Code2,
  },
  {
    id: 'architecture',
    label: 'Architecture',
    description: 'Comprendre les choix et compatibilités',
    icon: GitGraph,
  },
  {
    id: 'files',
    label: 'Fichiers générés',
    description: 'Inspecter le projet avant export',
    icon: FileCode,
  },
  {
    id: 'bricks',
    label: 'Bibliothèque de briques',
    description: 'Explorer les composants techniques',
    icon: Library,
  },
  {
    id: 'audit',
    label: 'Audit du moteur',
    description: 'Vérifier les garanties de génération',
    icon: CheckCircle2,
  },
];

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, onOpenAiAssist }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const activePage = navigationItems.find((item) => item.id === currentTab);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const openPage = (tab: AppTab) => {
    setCurrentTab(tab);
    setMenuOpen(false);
    if (tab !== 'wizard') menuButtonRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-shell">
        <button
          type="button"
          onClick={() => openPage('wizard')}
          aria-label="SpecForge — accueil"
          aria-current={currentTab === 'wizard' ? 'page' : undefined}
          className="flex shrink-0 items-center gap-2 rounded-lg text-left"
        >
          <img
            src={logo}
            alt=""
            width="36"
            height="42"
            decoding="async"
            className="h-10 w-9 object-contain"
          />
          <span className="text-sm font-bold tracking-tight text-neutral-100 sm:text-base">
            <span className="brand-cool-gradient">Spec</span>
            <span className="brand-forge">Forge</span>
          </span>
        </button>

        <nav aria-label="Navigation principale" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPage('wizard')}
            aria-current={currentTab === 'wizard' ? 'page' : undefined}
            className={`ov-button-translucent-action hidden h-11 items-center gap-2 px-3 text-xs sm:flex ${
              currentTab === 'wizard' ? 'ov-button-navigation-active' : ''
            }`}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Accueil</span>
          </button>

          <div
            ref={menuRef}
            className="relative"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setMenuOpen(false);
              }
            }}
          >
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="explore-navigation"
              className={`ov-button-translucent-action flex h-11 items-center gap-2 px-3 text-xs ${
                activePage ? 'ov-button-navigation-active' : ''
              }`}
            >
              <span>Explorer</span>
              {activePage && <span className="sr-only">Page active : {activePage.label}</span>}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            <div
              id="explore-navigation"
              className={`ov-panel absolute right-0 top-full mt-3 w-80 max-w-[90vw] overflow-hidden p-2 ${
                menuOpen ? 'block' : 'hidden'
              }`}
            >
              <nav aria-label="Explorer SpecForge">
                <ul className="space-y-1">
                  {navigationItems.map(({ id, label, description, icon: Icon }) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => openPage(id)}
                        aria-current={currentTab === id ? 'page' : undefined}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                          currentTab === id
                            ? 'bg-indigo-950/60 text-neutral-100'
                            : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold">{label}</span>
                          <span className="mt-0.5 block text-[11px] text-neutral-400">
                            {description}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-2 border-t border-neutral-800 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAiAssist();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
                >
                  <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
                  <span>
                    Assistant IA <span className="text-neutral-400">· proposition à confirmer</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};
