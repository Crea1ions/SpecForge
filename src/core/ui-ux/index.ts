/**
 * SpecForge Core — Module UI/UX des templates applicatifs
 *
 * Système de bricks UI/UX dédié : configuration commune, définitions de bricks,
 * implémentations natives par cible (Askama, React, Dioxus) et intégration par
 * template. Indépendant du système Static Web, qui reste autonome.
 */

export * from './config';
export * from './theme';
export * from './bricks';
export * from './registry';
export * from './implementations';
export * from './preview';
export {
  renderAskamaUiUx,
  renderAskamaPageBody,
  renderAskamaUiUxPreview,
  renderRustWebFrontendUiUx,
  applyUiUxThemeToTokensCss,
  uiUxAskamaSupplementaryCss,
  escapeAskamaDelimiters,
  ASKAMA_SCAFFOLD_STRATEGY,
  RUST_WEB_FRONTEND_THEME_TOKENS,
} from './implementations/askama';
export {
  renderReactUiUx,
  renderReactPageBodyJsx,
  renderReactUiUxPreview,
  uiUxReactThemeCss,
  uiUxReactSupplementaryCss,
  REACT_SCAFFOLD_STRATEGY,
} from './implementations/react';
export {
  renderDioxusUiUx,
  renderDioxusUiUxPreview,
  uiUxDioxusThemeCss,
  escapeRustString,
  DIOXUS_SCAFFOLD_STRATEGY,
} from './implementations/dioxus';
