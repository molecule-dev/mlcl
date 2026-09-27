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
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const defaultLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#0ea5e9',
    primaryLight: '#e0f2fe',
    secondary: '#7c3aed',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#06b6d4',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [defaultLightTheme, darkTheme],
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
