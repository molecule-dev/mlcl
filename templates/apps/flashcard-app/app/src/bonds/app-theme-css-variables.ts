/**
 * AppThemeCssVariables bond setup
 *
 * Engram: purple primary + amber accent for streaks; serif for card content.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const engramLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#6d28d9',
    primaryLight: '#ede9fe',
    secondary: '#d97706',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#e5e5e5',
    surface: '#ffffff',
    border: '#e5e5e5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [engramLightTheme, darkTheme],
  defaultTheme: 'light',
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
