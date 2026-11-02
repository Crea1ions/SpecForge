import { ProjectSpecification, StaticWebConfig } from '../types';

/**
 * Configuration Static Web d'un projet.
 *
 * Ce module ne connaît plus la configuration UI/UX des templates applicatifs :
 * celle-ci est portée par `core/ui-ux/` (voir `ui-ux/config.ts`). Le renderer
 * Static Web reste utilisé tel quel pour le profil Static Web et, sur option
 * explicite, pour le site documentaire `docs-site/` des templates API-only.
 */
export function getStaticWebConfig(spec: ProjectSpecification): StaticWebConfig | undefined {
  return spec.profile === 'static-web' ? spec.staticWeb : undefined;
}
