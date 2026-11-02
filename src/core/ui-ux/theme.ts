/**
 * SpecForge Core — Dérivation de palette UI/UX
 *
 * À partir des couleurs configurées (fond, texte, primaire, accent), dérive une
 * palette complète et contrastée pour chaque mode : surfaces, bordures et
 * textes secondaires sont calculés pour rester lisibles en clair comme en
 * sombre, quel que soit le thème choisi.
 */

import { ProjectUiUxConfig } from '../types';

export function hexColor(value: string, fallback: string): string {
  return /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

/** Mélange deux couleurs hex : t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const from = hexColor(a, '#000000').slice(1);
  const to = hexColor(b, '#ffffff').slice(1);
  const channel = (offset: number) => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * t).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function darkenHex(value: string, ratio = 0.18): string {
  return mixHex(value, '#000000', ratio);
}

export interface UiUxPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  accent: string;
}

/**
 * Palette complète pour un mode donné. Les surfaces et bordures sont dérivées
 * du fond (vers le blanc en sombre, vers le texte en clair) et le texte atténué
 * reste un mélange texte/fond — garantissant le contraste dans les deux modes.
 */
export function deriveUiUxPalette(
  theme: ProjectUiUxConfig['theme'],
  mode: 'light' | 'dark',
): UiUxPalette {
  const background = hexColor(mode === 'dark' ? theme.darkBackground : theme.background, mode === 'dark' ? '#111827' : '#ffffff');
  const text = hexColor(mode === 'dark' ? theme.darkText : theme.text, mode === 'dark' ? '#f3f4f6' : '#1f2937');
  const primary = hexColor(theme.primary, '#2563eb');
  const dark = mode === 'dark';

  return {
    background,
    surface: dark ? mixHex(background, '#ffffff', 0.07) : mixHex(background, '#ffffff', 0.72),
    surfaceMuted: dark ? mixHex(background, '#ffffff', 0.12) : mixHex(background, text, 0.06),
    surfaceHover: dark ? mixHex(background, '#ffffff', 0.16) : mixHex(background, text, 0.10),
    border: dark ? mixHex(background, '#ffffff', 0.22) : mixHex(background, text, 0.20),
    text,
    textMuted: mixHex(text, background, 0.30),
    primary,
    primaryHover: dark ? mixHex(primary, '#ffffff', 0.14) : darkenHex(primary),
    accent: hexColor(theme.accent, '#0f766e'),
  };
}
