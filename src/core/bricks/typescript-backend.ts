import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// TypeScript Express Backend Brick
export const typescriptBackendBrick: BrickDefinition = {
  id: 'typescript-backend',
  name: 'TypeScript Express Backend',
  category: 'backend',
  layer: 'app',
  version: '1.0.0',
  description: 'Backend Node.js typé en TypeScript avec Express, prêt pour une API REST.',
  iconName: 'FileCode2',
  provides: ['backend_runtime'],
  requires: [],
  applies: [{ backend: { enabled: true, language: 'typescript' } }],
  backendStack: { language: 'typescript', frameworks: ['express'] },
  conflictsWith: ['rust-backend', 'python-backend'],
  templateFiles: ['package.json', 'tsconfig.json', 'src/index.ts'],
  tags: ['typescript', 'express', 'nodejs'],

  generateDecisions: (ctx) => [
    {
      id: 'ADR-001',
      title: 'Sélection du runtime TypeScript (Express)',
      status: 'Accepted',
      context: 'Nécessité d\'un backend typé, dans l\'écosystème Node.js, simple à démarrer.',
      decision: `Adoption de TypeScript avec Express sur le port ${ctx.spec.backend.port}.`,
      consequences: ['Typage statique vérifié par tsc, exécution via Node.js.'],
      generatingBrick: 'typescript-backend',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];
    const name = JSON.stringify(spec.project.name);
    const version = JSON.stringify(spec.project.version);
    const db = JSON.stringify(spec.database.enabled ? spec.database.type : 'none');

    const pkg = {
      name: spec.project.slug,
      version: spec.project.version,
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        lint: 'tsc --noEmit',
      },
      dependencies: {
        express: '^4.21.2',
        ...(spec.authentication.enabled ? { jsonwebtoken: '^9.0.3' } : {}),
      },
      devDependencies: {
        '@types/express': '^4.17.21',
        ...(spec.authentication.enabled ? { '@types/jsonwebtoken': '^9.0.10' } : {}),
        '@types/node': '^22.14.0',
        tsx: '^4.19.0',
        typescript: '^5.6.0',
      },
    };
    files.push(
      makeFile(
        'package.json',
        JSON.stringify(pkg, null, 2) + '\n',
        'json',
        'typescript-backend',
        'TypeScript Express Backend',
        '1.0.0',
        'Manifeste npm : Express, TypeScript et scripts dev/build/start/lint.'
      )
    );

    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    };
    files.push(
      makeFile(
        'tsconfig.json',
        JSON.stringify(tsconfig, null, 2) + '\n',
        'json',
        'typescript-backend',
        'TypeScript Express Backend',
        '1.0.0',
        'Configuration du compilateur TypeScript (strict, ES2022, NodeNext).'
      )
    );

    const corsBlock = spec.backend.cors
      ? `
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
`
      : '';

    const indexTs = `import express from 'express';

const app = express();
const PORT = Number(process.env.PORT ?? ${spec.backend.port});

app.use(express.json());
${corsBlock}
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: ${name},
    version: ${version},
    database: ${db},
  });
});

app.get('/api/items', (_req, res) => {
  res.json([
    { id: 1, title: 'Configuration initiale', completed: true },
    { id: 2, title: 'Service API TypeScript', completed: true },
  ]);
});

app.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
});
`;
    files.push(
      makeFile(
        'src/index.ts',
        indexTs,
        'typescript',
        'typescript-backend',
        'TypeScript Express Backend',
        '1.0.0',
        'Point d\'entrée Express avec CORS optionnel et routes de santé.'
      )
    );

    return files;
  },
};