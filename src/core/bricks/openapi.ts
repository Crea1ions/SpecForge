import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 9. OpenAPI Brick
export const openapiBrick: BrickDefinition = {
  id: 'openapi',
  name: 'OpenAPI Contract',
  category: 'api',
  version: '1.0.0',
  description: 'Contrat et documentation d’API au format OpenAPI.',
  iconName: 'FileJson',
  provides: ['openapi_contract', 'api_documentation'],
  requires: ['rest_server'],
  applies: [{ api: { openapi: true } }],
  compatibleWith: ['rust-backend', 'python-backend', 'rest-api', 'react-vite'],
  conflictsWith: [],
  options: [],
  templateFiles: ['openapi.yaml'],
  tags: ['openapi', 'api', 'documentation', 'swagger'],

  generateDecisions: () => [
    {
      id: 'ADR-OPENAPI-001',
      title: 'Contrat d’API avec OpenAPI',
      status: 'Accepted',
      context:
        'Le projet expose une API et nécessite un contrat formel permettant de décrire ses endpoints, ses paramètres et ses schémas de données.',
      decision:
        'Adoption du standard OpenAPI pour décrire et documenter le contrat de l’API.',
      consequences: [
        'Le contrat de l’API est versionné avec le projet.',
        'La documentation des endpoints peut être générée ou consommée par des outils compatibles OpenAPI.',
        'Les évolutions du contrat d’API deviennent explicites et vérifiables.',
      ],
      generatingBrick: 'openapi',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.activeBricks.some((brick) => brick.id === 'rest-api')) {
      const openapiYaml = `openapi: 3.0.3
info:
  title: ${ctx.spec.project.name}
  version: ${ctx.spec.project.version}
  description: ${ctx.spec.project.description}

servers:
  - url: http://localhost:${ctx.spec.backend.port}

paths:
  /api/health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service disponible

  /api/items:
    get:
      summary: Liste des items
      responses:
        '200':
          description: Liste des items

    post:
      summary: Créer un item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateItemRequest'
      responses:
        '201':
          description: Item créé

components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: integer
          format: int64
        title:
          type: string
        completed:
          type: boolean
      required:
        - id
        - title
        - completed

    CreateItemRequest:
      type: object
      properties:
        title:
          type: string
      required:
        - title
`;

      files.push(
        makeFile(
          'openapi.yaml',
          openapiYaml,
          'yaml',
          'openapi',
          'OpenAPI Contract',
          '1.0.0',
          'Contrat OpenAPI décrivant les endpoints REST et leurs schémas.'
        )
      );
    }

    return files;
  },
};
