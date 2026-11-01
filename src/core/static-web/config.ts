import { ApplicationTemplate, ProjectSpecification, StaticWebConfig } from '../types';
import { slugifyStaticWebValue } from './content';

const defaultTheme: StaticWebConfig['theme'] = {
  preset: 'paper',
  primary: '#2563eb',
  accent: '#0f766e',
  background: '#ffffff',
  text: '#1f2937',
  darkBackground: '#111827',
  darkText: '#f3f4f6',
};

export function getProjectUiUxConfig(spec: ProjectSpecification): StaticWebConfig | undefined {
  return spec.profile === 'static-web' ? spec.staticWeb : spec.uiUx;
}

export function createDefaultProjectUiUxConfig(spec: ProjectSpecification): StaticWebConfig {
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

export function resolveUiUxPresentationTemplate(spec: ProjectSpecification): ApplicationTemplate {
  if (spec.profile === 'static-web') return spec.template;
  return spec.template === 'api-service' ? 'static-documentation' : 'static-website';
}

export function resolveUiUxOutputDirectory(spec: ProjectSpecification): string {
  if (spec.template === 'api-service' || !spec.frontend.enabled) return 'docs-site';
  switch (spec.frontend.framework) {
    case 'react':
      return 'frontend/public/ui-site';
    case 'askama':
      return 'static/ui-site';
    case 'dioxus':
      return 'assets/ui-site';
    default:
      return 'ui-site';
  }
}
