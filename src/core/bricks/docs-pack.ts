import { BrickDefinition, GeneratedFile } from '../types';
import { makeFile } from './helpers';

// 13. Documentation Pack Brick
export const docsPackBrick: BrickDefinition = {
  id: 'docs-pack',
  name: 'Project README',
  category: 'documentation',
  version: '1.3.0',
  description: 'README minimal contenant les informations directement disponibles sur le projet.',
  iconName: 'BookOpen',
  provides: ['dev_documentation'],
  requires: [],
  compatibleWith: [],
  conflictsWith: [],
  options: [],
  templateFiles: ['README.md'],
  tags: ['docs', 'readme'],

  generateFiles: (ctx) => {
    const { spec } = ctx;
    const files: GeneratedFile[] = [];

    if (spec.documentation.readme) {
      const readme = `# ${spec.project.name}

> ${spec.project.description}

## Informations du projet

- **Version :** \`${spec.project.version}\`
- **Profil technique :** \`${spec.profile}\`
- **Type d'application :** \`${spec.template}\`
- **Auteur :** ${spec.project.author}
- **Licence :** \`${spec.project.license}\`

La documentation technique de référence du projet se trouve dans
\`project.yaml\`.

Une représentation lisible de cette spécification est disponible dans
\`project.md\`.
`;

      files.push(
        makeFile(
          'README.md',
          readme,
          'markdown',
          'docs-pack',
          'Project README',
          '1.3.0',
          'README minimal contenant les informations directement disponibles sur le projet.'
        )
      );
    }

    return files;
  },
};
