import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 10. Systemd Infrastructure Brick
export const systemdInfraBrick: BrickDefinition = {
  id: 'systemd-infra',
  name: 'Systemd Service',
  category: 'infrastructure',
  layer: 'ops',
  version: '1.0.0',
  description: 'Configuration d’un service Linux systemd pour exécuter le backend.',
  iconName: 'ServerCog',
  provides: ['systemd_service', 'linux_service'],
  requires: ['backend_runtime'],
  applies: [{ infrastructure: { systemd: true } }],
  conflictsWith: [],
  templateFiles: ['deploy/systemd/app.service'],
  tags: ['systemd', 'linux', 'service', 'deployment'],

  generateDecisions: () => [
    {
      id: 'ADR-SYSTEMD-001',
      title: 'Déploiement du backend avec systemd',
      status: 'Accepted',
      context:
        'Le projet nécessite un mécanisme natif Linux permettant d’exécuter et de superviser le backend comme un service système.',
      decision:
        'Utilisation de systemd pour gérer le cycle de vie du service backend.',
      consequences: [
        'Le backend peut être démarré, arrêté et redémarré comme un service système.',
        'Le service bénéficie des mécanismes de supervision et de journalisation de systemd.',
        'La configuration du service dépend de l’environnement Linux cible.',
      ],
      generatingBrick: 'systemd-infra',
    },
  ],

  generateFiles: (ctx) => {
    const files: GeneratedFile[] = [];

    if (ctx.spec.backend.enabled) {
      const serviceFile = `[Unit]
Description=${ctx.spec.project.name} backend service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/${ctx.spec.project.name}
ExecStart=/opt/${ctx.spec.project.name}/${ctx.spec.project.name}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

      files.push(
        makeFile(
          'deploy/systemd/app.service',
          serviceFile,
          'bash',
          'systemd-infra',
          'Systemd Service',
          '1.0.0',
          'Service systemd pour l’exécution du backend.'
        )
      );
    }

    return files;
  },
};
