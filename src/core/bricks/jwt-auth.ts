import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 7. JWT Authentication Brick
export const jwtAuthBrick: BrickDefinition = {
  id: 'jwt-auth',
  name: 'JWT Authentication',
  category: 'authentication',
  version: '1.0.0',
  description: 'Authentification stateless basée sur des JSON Web Tokens (JWT).',
  iconName: 'ShieldCheck',
  provides: ['jwt_authentication', 'token_authentication'],
  requires: ['backend_runtime'],
  compatibleWith: ['rust-backend', 'python-backend', 'rest-api', 'react-vite'],
  conflictsWith: [],
  options: [],
  templateFiles: ['src/auth.rs'],
  tags: ['auth', 'jwt', 'security', 'token'],

  generateDecisions: () => [
    {
      id: 'ADR-JWT-001',
      title: 'Authentification par JSON Web Token',
      status: 'Accepted',
      context:
        'Le projet nécessite un mécanisme d’authentification permettant de sécuriser les accès à l’application et à son API.',
      decision:
        'Adoption de JSON Web Tokens (JWT) comme mécanisme d’authentification stateless.',
      consequences: [
        'Les informations d’authentification sont portées par un token signé.',
        'Le backend n’a pas besoin de maintenir une session serveur pour chaque client authentifié.',
        'La gestion et la protection de la clé de signature deviennent une responsabilité de configuration du backend.',
      ],
      generatingBrick: 'jwt-auth',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.spec.backend.language === 'rust') {
      const authRs = `//! Authentification JWT
//!
//! Point d'intégration de l'authentification par JSON Web Token.
//! Les détails de configuration et les handlers pourront être complétés
//! par le générateur lorsque les options d'authentification seront définies.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}
`;

      files.push(
        makeFile(
          'src/auth.rs',
          authRs,
          'rust',
          'jwt-auth',
          'JWT Authentication',
          '1.0.0',
          'Modèle de claims et point d’intégration de l’authentification JWT.'
        )
      );
    }

    return files;
  },
};
