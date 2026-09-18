/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Conduit defaults to dark mode (`#0c0e14` deep navy) with emerald primary.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const conduitDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#10b981',
    primaryLight: '#34d399',
    secondary: '#10b981',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
    background: '#0c0e14',
    backgroundSecondary: '#161926',
    backgroundTertiary: '#1f2333',
    surface: '#161926',
    border: '#2a2f42',
    text: '#e5e7eb',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    textInverse: '#0c0e14',
  },
}

// Light theme kept available for users who toggle out of dark, but Conduit
// presents dark as the canonical look.
const conduitLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#047857',
    primaryLight: '#d1fae5',
    secondary: '#475569',
    background: '#f9fafb',
    backgroundSecondary: '#f3f4f6',
    backgroundTertiary: '#e5e7eb',
    surface: '#ffffff',
    border: '#d1d5db',
    text: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [conduitDarkTheme, conduitLightTheme],
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
