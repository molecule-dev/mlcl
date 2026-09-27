/**
 * AppThemeCssVariables bond setup
 *
 * Coffer uses a violet-primary, cyan-accent palette. Sidebar inherits
 * surface (no inverted nav).
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const cofferLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#7c3aed',
    primaryLight: '#ede9fe',
    secondary: '#0891b2',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    background: '#faf5ff',
    backgroundSecondary: '#f5f0ff',
    backgroundTertiary: '#ede9fe',
    surface: '#ffffff',
    border: '#e9d5ff',
    text: '#1e1b4b',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
  },
}

const cofferDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#7c3aed',
    primaryLight: '#2e1065',
    secondary: '#94a3b8',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    background: '#0b1220',
    backgroundSecondary: '#131c2e',
    backgroundTertiary: '#1c2538',
    surface: '#131c2e',
    border: '#29334a',
    text: '#e2e8f0',
    textSecondary: '#cbd5e1',
    textTertiary: '#8b96a8',
    textInverse: '#0b1220',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [cofferLightTheme, cofferDarkTheme],
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
