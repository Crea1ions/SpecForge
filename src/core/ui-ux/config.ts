/**
 * SpecForge Core — Configuration UI/UX des templates applicatifs
 *
 * Configuration visuelle commune (pages, blocs, thème, navigation, assets)
 * alimentant les implémentations natives de chaque template. Module indépendant
 * du système Static Web (`core/static-web/`), qui reste autonome.
 */

import {
  ProjectSpecification,
  ProjectUiUxConfig,
  StaticWebConfig,
} from '../types';
import { slugifyStaticWebValue } from '../static-web/content';

/** Répertoire du site documentaire des templates API-only (option explicite). */
export const UI_UX_DOCS_SITE_DIRECTORY = 'docs-site';

const defaultTheme: ProjectUiUxConfig['theme'] = {
  preset: 'paper',
  primary: '#b45309',
  accent: '#4d7c0f',
  background: '#f7f2e8',
  text: '#2b2622',
  darkBackground: '#1c1917',
  darkText: '#f3ece1',
};

/**
 * Accès unifié pour l'éditeur partagé : configuration Static Web pour le profil
 * Static Web, configuration UI/UX applicative sinon.
 */
export function getEditableUiUxConfig(
  spec: ProjectSpecification,
): StaticWebConfig | ProjectUiUxConfig | undefined {
  return spec.profile === 'static-web' ? spec.staticWeb : spec.uiUx;
}

export function createDefaultProjectUiUxConfig(spec: ProjectSpecification): ProjectUiUxConfig {
  const title = spec.project.name.trim() || 'Accueil';
  const slug = slugifyStaticWebValue(title) || 'accueil';
  const description = spec.project.description.trim();

  return {
    compositionMode: 'content-driven',
    organization: 'multi-page',
    navigation: 'burger',
    displayMode: 'toggle',
    exportMode: 'multi-file',
    contentInstruction: '',
    docsSite: false,
    theme: { ...defaultTheme },
    pages: [
      {
        id: `page-${slug}`,
        title,
        slug,
        description,
        order: 0,
        category: '',
        tags: [],
        markdown: `# ${title}${description ? `\n\n${description}` : '\n\nPrésentez ici le contenu de votre projet.'}`,
        blocks: [],
      },
    ],
    assets: [],
  };
}
