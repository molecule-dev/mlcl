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
    primary: '#1a6b4f',
    primaryLight: '#2a8f6b',
    primaryDark: '#0e4d38',
    secondary: '#2563eb',
    secondaryLight: '#3b82f6',
    error: '#dc2626',
    success: '#16a34a',
    background: '#f8faf9',
    surface: '#ffffff',
    text: '#1a2e28',
    textSecondary: '#5a706a',
    textTertiary: '#8a9e98',
    border: '#d4e0dc',
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
