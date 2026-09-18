/**
 * AppThemeCssVariables bond setup
 *
 * Fugue: dark studio aesthetic with neon violet primary and pink accent.
 * Defaults to the dark theme — Fugue is dark-first per its DESIGN.md.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const fugueDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    secondary: '#ec4899',
    success: '#22c55e',
    warning: '#facc15',
    error: '#ef4444',
    info: '#22d3ee',
    background: '#0c0a13',
    backgroundSecondary: '#13111c',
    backgroundTertiary: '#1a1726',
    surface: '#1e1b2e',
    border: '#2d2945',
    text: '#f1f0f5',
    textSecondary: '#9894a8',
    textTertiary: '#706c82',
    textInverse: '#0c0a13',
  },
}

const fugueLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    secondary: '#ec4899',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0891b2',
    background: '#f5f3ff',
    backgroundSecondary: '#ede9fe',
    backgroundTertiary: '#ddd6fe',
    surface: '#ffffff',
    border: '#ddd6fe',
    text: '#1e1b2e',
    textSecondary: '#6d6884',
    textTertiary: '#9894a8',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [fugueDarkTheme, fugueLightTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
})

export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
