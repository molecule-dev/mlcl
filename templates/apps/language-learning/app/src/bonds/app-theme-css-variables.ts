/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Parlance uses a purple-violet brand palette layered over the base light theme
 * (Material 3 derivative tokens are filled in index.css).
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const parlanceLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#6c3ce0',
    primaryLight: '#8b5cf6',
    primaryDark: '#5b21b6',
    secondary: '#f59e0b',
    success: '#16a34a',
    warning: '#f97316',
    error: '#dc2626',
    info: '#1cb0f6',
    background: '#faf7ff',
    backgroundSecondary: '#f5f3ff',
    backgroundTertiary: '#ede9fe',
    surface: '#ffffff',
    border: '#ede9fe',
    text: '#1f1535',
    textSecondary: '#6b5d8a',
    textTertiary: '#4a3d6b',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [parlanceLightTheme, darkTheme],
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
