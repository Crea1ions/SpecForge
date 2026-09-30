import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile, makeBinaryFile } from './helpers';
import { FAVICON_BASE64 } from '../assets/favicon';

// 3. React + Vite Frontend Brick
export const reactViteBrick: BrickDefinition = {
  id: 'react-vite',
  name: 'React 19 + Vite Frontend',
  category: 'frontend',
  version: '2.1.0',
  description: 'Application Single-Page moderne avec React 19, Vite, TypeScript et Tailwind CSS.',
  iconName: 'Layout',
  provides: ['ui_client', 'spa_bundle'],
  requires: [],
  applies: [{ frontend: { enabled: true, framework: 'react' } }],
  compatibleWith: ['rust-backend', 'python-backend', 'tauri-desktop', 'rest-api'],
  conflictsWith: [],
  options: [
    {
      key: 'styling',
      label: 'Moteur CSS',
      type: 'select',
      default: 'tailwind',
      options: [
        { value: 'tailwind', label: 'Tailwind CSS (Classes utilitaires modernes)' },
        { value: 'css', label: 'CSS Modules classiques' },
      ],
      description: 'Système de style.',
    },
  ],
  templateFiles: [
    'frontend/package.json',
    'frontend/index.html',
    'frontend/public/favicon.png',
    'frontend/vite.config.ts',
    'frontend/tsconfig.json',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json',
    'frontend/src/main.tsx',
    'frontend/src/App.tsx',
    'frontend/src/index.css',
  ],
  tags: ['react', 'vite', 'typescript', 'tailwind'],

  generateDecisions: () => [
    {
      id: 'ADR-002',
      title: 'Adoption du frontend React 19 avec Vite',
      status: 'Accepted',
      context: 'Nécessité d\'une interface moderne et performante.',
      decision: 'Intégration de React 19 compilé par Vite avec Tailwind CSS.',
      consequences: [
        'Builds HMR instantanés en développement.',
        'Architecture SPA découplée du backend.',
      ],
      generatingBrick: 'react-vite',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    // Proxy /api utile seulement si un serveur HTTP est réellement généré.
    const hasHttpBackend =
      spec.backend.enabled &&
      ctx.activeBricks.some((b) => b.id === 'rest-api' || b.id === 'python-backend');

    const pkg = `{
  "name": "${spec.project.slug}-frontend",
  "private": true,
  "version": "${spec.project.version}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.2",
    "vite": "^6.0.3",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
`;
    files.push(
      makeFile(
        'frontend/package.json',
        pkg,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Manifeste npm déclarant React 19, Tailwind CSS et Vite pour l\'interface utilisateur.',
        'ADR-002'
      )
    );

    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${spec.project.name}</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    files.push(
      makeBinaryFile(
        'frontend/public/favicon.png',
        FAVICON_BASE64,
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Favicon PNG 64x64 par défaut, copié tel quel dans dist/ par Vite.'
      )
    );
    files.push(
      makeFile(
        'frontend/index.html',
        indexHtml,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée HTML racine requis par Vite pour charger et monter l\'application.'
      )
    );

    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,${hasHttpBackend ? `
    proxy: {
      '/api': {
        target: 'http://localhost:${spec.backend.port}',
        changeOrigin: true,
      },
    },` : ''}
  },
});
`;
    files.push(
      makeFile(
        'frontend/vite.config.ts',
        viteConfig,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration du bundler Vite avec reverse-proxy automatique vers le backend.'
      )
    );

    const tsconfigJson = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.json',
        tsconfigJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Fichier de configuration TypeScript racine orchestrant les références de projet (tsc -b).'
      )
    );

    const tsconfigAppJson = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.app.json',
        tsconfigAppJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration du compilateur TypeScript pour les composants et fichiers sources de l\'application.'
      )
    );

    const tsconfigNodeJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
`;
    files.push(
      makeFile(
        'frontend/tsconfig.node.json',
        tsconfigNodeJson,
        'json',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Configuration TypeScript pour les scripts d\'outillage Node et Vite.'
      )
    );

    const mainTsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
`;
    files.push(
      makeFile(
        'frontend/src/main.tsx',
        mainTsx,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée applicatif montant le composant racine App dans le DOM.'
      )
    );
    const indexCss = `@import "tailwindcss";

:root {
  color-scheme: dark;

  --background: #0d1117;
  --surface-1: #151b23;
  --surface-2: #1b232d;
  --surface-hover: #232d38;
  --surface-raised: #202a35;

  --text-primary: #edf3f5;
  --text-secondary: #a7b4bb;
  --text-muted: #71808a;

  --accent: #1aa8c0;
  --accent-hover: #28c2d8;
  --accent-soft: rgba(26, 168, 192, 0.12);

  --accent-orange: #f59e0b;
  --accent-orange-soft: rgba(245, 158, 11, 0.12);

  --border: rgba(255, 255, 255, 0.075);
  --border-strong: rgba(255, 255, 255, 0.12);

  --success: #4ade80;
  --warning: #facc15;
  --danger: #f87171;

  --radius: 14px;
  --radius-small: 10px;

  --shadow:
    0 14px 35px rgba(0, 0, 0, 0.28);

  --sidebar-width: 260px;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

:root[data-theme="light"] {
  color-scheme: light;

  --background: #f3f5f6;
  --surface-1: #ffffff;
  --surface-2: #eef1f3;
  --surface-hover: #e4e9ec;
  --surface-raised: #ffffff;

  --text-primary: #172027;
  --text-secondary: #52616a;
  --text-muted: #7a8790;

  --accent: #147f94;
  --accent-hover: #0f6d80;
  --accent-soft: rgba(20, 127, 148, 0.10);

  --accent-orange: #d97706;
  --accent-orange-soft: rgba(217, 119, 6, 0.10);

  --border: rgba(15, 23, 30, 0.10);
  --border-strong: rgba(15, 23, 30, 0.16);

  --shadow:
    0 14px 35px rgba(15, 23, 30, 0.08);
}

@theme inline {
  --color-background: var(--background);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-hover: var(--surface-hover);
  --color-surface-raised: var(--surface-raised);

  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);

  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);

  --color-accent-orange: var(--accent-orange);
  --color-accent-orange-soft: var(--accent-orange-soft);

  --color-border: var(--border);
  --color-border-strong: var(--border-strong);

  --radius-card: var(--radius);
  --radius-control: var(--radius-small);

  --shadow-card: var(--shadow);
}

html {
  background: var(--background);
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(
      circle at 15% 10%,
      var(--accent-soft),
      transparent 28rem
    ),
    radial-gradient(
      circle at 90% 80%,
      var(--accent-orange-soft),
      transparent 24rem
    ),
    var(--background);
  color: var(--text-primary);
}

button {
  font: inherit;
  cursor: pointer;
}

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;
          const appTsx = `import { useEffect, useState, type ReactNode } from 'react';
import {
  Database,
  LayoutDashboard,
  Menu,
  Moon,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/health');
      if (res.ok) setHealth(await res.json());

      const itemsRes = await fetch('/api/items');
      if (itemsRes.ok) setItems(await itemsRes.json());
    } catch (err) {
      console.warn('Backend en attente...', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed left-0 top-0 bottom-0 z-10 w-[260px] border-r border-border bg-gradient-to-b from-surface-1 to-surface-2 px-[18px] py-6 shadow-[8px_0_30px_rgba(0,0,0,0.08)] max-[900px]:hidden">
        <div className="mb-[34px] flex items-center px-2 text-xl font-extrabold tracking-[-0.03em] text-text-primary">
          <span className="mr-2 inline-flex gap-1">
            <span className="h-2 w-2 rounded-[3px] bg-accent" />
            <span className="h-2 w-2 rounded-[3px] bg-accent-orange" />
          </span>
          ${spec.project.name}
        </div>

        <nav className="flex flex-col gap-1">
          <Nav
            icon={<LayoutDashboard />}
            label="Overview"
            active
          />
          <Nav
            icon={<Server />}
            label="Backend"
          />
          <Nav
            icon={<Database />}
            label="Data"
          />
          <Nav
            icon={<ShieldCheck />}
            label="Security"
          />

          <div className="my-4 mx-2 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

          <Nav
            icon={<Settings />}
            label="Settings"
          />
        </nav>
      </aside>

      <header className="hidden fixed left-0 right-0 top-0 z-[15] h-[60px] items-center justify-between border-b border-border bg-surface-1/90 px-[14px] py-2 backdrop-blur-md max-[900px]:flex">
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label="Ouvrir le menu"
          className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-transparent text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>

        <strong className="text-[15px] tracking-[-0.02em]">
          ${spec.project.name}
        </strong>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
          className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-surface-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {menu && (
        <div className="fixed inset-0 z-20 flex flex-col gap-2 bg-surface-1 p-[18px]">
          <div className="mb-[18px] flex justify-end">
            <button
              type="button"
              onClick={() => setMenu(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-control border-0 bg-surface-2 text-text-secondary hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <Nav
            icon={<LayoutDashboard />}
            label="Overview"
            active
            onClick={() => setMenu(false)}
          />
          <Nav
            icon={<Server />}
            label="Backend"
            onClick={() => setMenu(false)}
          />
          <Nav
            icon={<Database />}
            label="Data"
            onClick={() => setMenu(false)}
          />
          <Nav
            icon={<ShieldCheck />}
            label="Security"
            onClick={() => setMenu(false)}
          />
          <Nav
            icon={<Settings />}
            label="Settings"
            onClick={() => setMenu(false)}
          />
        </div>
      )}

      <main className="min-h-screen ml-[260px] px-12 py-[52px] max-[900px]:ml-0 max-[900px]:px-5 max-[900px]:pb-10 max-[900px]:pt-[88px]">
        <header className="mb-[34px] flex items-center justify-between gap-6 border-b border-border pb-5 max-[600px]:items-start">
          <div>
            <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-[-0.035em] text-text-primary max-[600px]:text-2xl">
              ${spec.project.name}
            </h1>
            <p className="mt-[9px] mb-0 text-sm text-text-secondary">
              ${spec.project.description}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            className="flex shrink-0 items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-text-primary"
          >
            <RefreshCw
              className={loading
                ? 'h-4 w-4 animate-spin motion-reduce:animate-none'
                : 'h-4 w-4'}
            />
            Rafraîchir
          </button>
        </header>

        <section className="grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-1 max-[900px]:gap-3">
          <Card
            icon={<Server />}
            title="Backend"
            accent="accent"
          >
            <p>
              Runtime : <strong>${spec.backend.language.toUpperCase()}</strong>
            </p>
            <p>
              Port : <strong>${spec.backend.port}</strong>
            </p>
            <p>
              État : <strong>{health?.status ?? '${hasHttpBackend ? 'En attente' : 'Aucun backend HTTP'}'}</strong>
            </p>
          </Card>

          <Card
            icon={<Database />}
            title="Persistance"
            accent="orange"
          >
            <p>
              Type : <strong>${spec.database.enabled ? spec.database.type.toUpperCase() : 'Aucune'}</strong>
            </p>
            <p>
              Éléments chargés : <strong>{items.length}</strong>
            </p>
          </Card>

          <Card
            icon={<ShieldCheck />}
            title="Authentification"
            accent="accent"
          >
            <p>
              Provider : <strong>${spec.authentication.enabled ? spec.authentication.provider.toUpperCase() : 'Désactivée'}</strong>
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Nav({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 rounded-control border px-3 py-[10px] text-left text-sm transition-[background,border-color,color,transform] duration-150 ' +
        (active
          ? 'border-accent/20 bg-accent-soft text-text-primary'
          : 'border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary') +
        ' active:translate-y-px'
      }
    >
      <span className={active ? 'text-accent' : ''}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Card({
  icon,
  title,
  accent = 'accent',
  children,
}: {
  icon: ReactNode;
  title: string;
  accent?: 'accent' | 'orange';
  children: ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-gradient-to-br from-surface-raised to-surface-1 p-[22px] shadow-card transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong before:absolute before:left-[22px] before:top-0 before:h-[2px] before:w-[34px] before:rounded-b-[3px] before:bg-accent">
      <div
        className={
          'mb-4 flex items-center gap-2 text-xs font-bold ' +
          (accent === 'orange' ? 'text-accent-orange' : 'text-accent')
        }
      >
        {icon}
        {title}
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        {children}
      </div>
    </article>
  );
}
`;
    files.push(
      makeFile(
        'frontend/src/App.tsx',
        appTsx,
        'typescript',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Composant racine React connecté aux routes de santé et données du backend.'
      )
    );

    files.push(
      makeFile(
        'frontend/src/index.css',
        indexCss,
        'css',
        'react-vite',
        'React 19 + Vite Frontend',
        '2.1.0',
        'Point d\'entrée Tailwind CSS.'
      )
    );

    return files;
  },
};
