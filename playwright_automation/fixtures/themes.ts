/** Storybook global theme ids (data-theme on documentElement). */
export const MODUS_THEMES = [
  'modus-modern-light',
  'modus-modern-dark',
  'modus-classic-light',
  'modus-classic-dark',
  'connect-light',
  'connect-dark',
] as const;

export type ModusThemeId = (typeof MODUS_THEMES)[number];

export function themeGlobalsQuery(theme: ModusThemeId): string {
  return `globals=theme:${theme}`;
}
