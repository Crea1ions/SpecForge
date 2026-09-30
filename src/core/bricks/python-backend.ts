import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 2. Python FastAPI Backend Brick
export const pythonBackendBrick: BrickDefinition = {
  id: 'python-backend',
  name: 'Python FastAPI Backend',
  category: 'backend',
  version: '1.1.0',
  description: 'Backend moderne et rapide en Python avec typage Pydantic et documentation OpenAPI automatique.',
  iconName: 'FileCode2',
  provides: ['backend_runtime', 'ai_ready_core'],
  requires: [],
  applies: [{ backend: { enabled: true, language: 'python' } }],
  backendStack: { language: 'python', frameworks: ['fastapi'] },
  compatibleWith: ['react-vite', 'sqlite-storage', 'postgres-storage', 'rest-api', 'docker-infra'],
  conflictsWith: ['rust-backend'],
  options: [
    {
      key: 'port',
      label: 'Port HTTP',
      type: 'number',
      default: 8000,
      description: 'Port d\'écoute Uvicorn.',
    },
  ],
  templateFiles: ['pyproject.toml', 'main.py', 'requirements.txt'],
  tags: ['python', 'fastapi', 'pydantic', 'asyncio'],

  generateDecisions: (ctx) => [
    {
      id: 'ADR-001',
      title: 'Sélection du runtime Python (FastAPI)',
      status: 'Accepted',
      context: 'Nécessité d\'un backend dynamique compatible avec l\'écosystème IA et manipulation de données.',
      decision: `Adoption de Python avec FastAPI sur le port ${ctx.spec.backend.port}.`,
      consequences: ['Documentation OpenAPI interactive générée automatiquement sur /docs.'],
      generatingBrick: 'python-backend',
    },
  ],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    const reqs = `fastapi>=0.111.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
python-dotenv>=1.0.0
${spec.database.enabled ? 'sqlalchemy>=2.0.0' : ''}
`;
    files.push(
      makeFile(
        'requirements.txt',
        reqs,
        'bash',
        'python-backend',
        'Python FastAPI Backend',
        '1.1.0',
        'Fichier de dépendances Python pip (FastAPI, Uvicorn, Pydantic).'
      )
    );

    const mainPy = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(title="${spec.project.name}", version="${spec.project.version}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "${spec.project.name}",
        "version": "${spec.project.version}",
        "database": "${spec.database.enabled ? spec.database.type : 'none'}"
    }

@app.get("/api/items")
def list_items():
    return [
        {"id": 1, "title": "Configuration initiale", "completed": True},
        {"id": 2, "title": "Service API Python", "completed": True}
    ]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=${spec.backend.port}, reload=True)
`;
    files.push(
      makeFile(
        'main.py',
        mainPy,
        'typescript',
        'python-backend',
        'Python FastAPI Backend',
        '1.1.0',
        'Point d\'entrée applicatif FastAPI avec middleware CORS et routes de santé.'
      )
    );

    return files;
  },
};
