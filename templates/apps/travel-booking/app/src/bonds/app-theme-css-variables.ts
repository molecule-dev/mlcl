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
    primary: '#0c7a8a',
    primaryLight: '#cffafe',
    secondary: '#064e5c',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0c7a8a',
    background: '#f8fafb',
    backgroundSecondary: '#eef4f6',
    backgroundTertiary: '#e2eef1',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
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
