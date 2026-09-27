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
    primary: '#1a8917',
    primaryLight: '#e6f5e6',
    primaryDark: '#126611',
    secondary: '#292929',
    background: '#ffffff',
    backgroundSecondary: '#fafafa',
    backgroundTertiary: '#f5f5f5',
    surface: '#fafafa',
    surfaceSecondary: '#f2f2f2',
    inputBackground: '#ffffff',
    text: '#292929',
    textSecondary: '#757575',
    textTertiary: '#b3b3b3',
    textInverse: '#ffffff',
    border: '#e6e6e6',
    borderSecondary: '#d4d4d4',
    borderFocus: '#1a8917',
    success: '#1a8917',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#3b82f6',
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
