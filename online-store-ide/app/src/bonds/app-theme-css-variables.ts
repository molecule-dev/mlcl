/*
 * ⚠️ COLORS ARE NOT DEFINED HERE. This app's palette lives in app/src/theme.css
 * (the --color-* variables), which OVERRIDES anything set here. To recolor the
 * app, edit theme.css — NOT this file. This bond only wires light/dark mode.
 */
/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const lightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#15803d', // green-700 — #16a34a was 3.13:1 as text on white (axe serious)
    primaryLight: '#dcfce7',
    primaryDark: '#166534',
    secondary: '#0f172a',
    success: '#15803d',
    warning: '#eab308',
    error: '#dc2626',
    info: '#0ea5e9',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

const darkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#4ade80',
    primaryLight: '#14352a',
    primaryDark: '#16a34a',
    secondary: '#d4d0c8',
    background: '#14110e',
    backgroundSecondary: '#1d1a16',
    backgroundTertiary: '#26221d',
    surface: '#1a1714',
    surfaceSecondary: '#221e1a',
    border: '#2c2620',
    text: '#f0ecdf',
    textSecondary: '#c4bcaa',
    textTertiary: '#8a8270',
    textInverse: '#ffffff',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
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
