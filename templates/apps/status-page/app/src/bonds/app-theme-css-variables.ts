/**
 * AppThemeCssVariables bond setup
 *
 * Vigil — dark-first emerald brand. See DESIGN.md.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const vigilLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#10b981',
    primaryLight: '#d1fae5',
    secondary: '#6366f1',
    secondaryLight: '#e0e7ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',
    background: '#f9fafb',
    backgroundSecondary: '#f3f4f6',
    surface: '#ffffff',
    border: '#e5e7eb',
    borderFocus: '#6366f1',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

const vigilDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#10b981',
    primaryLight: '#d1fae5',
    primaryDark: '#34d399',
    secondary: '#6366f1',
    secondaryLight: '#e0e7ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',
    background: '#0b1120',
    backgroundSecondary: '#111827',
    backgroundTertiary: '#1a2332',
    surface: '#1e293b',
    surfaceSecondary: '#243244',
    inputBackground: '#1e293b',
    border: '#1e293b',
    borderSecondary: '#334155',
    borderFocus: '#6366f1',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    textInverse: '#0f172a',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [vigilLightTheme, vigilDarkTheme],
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
