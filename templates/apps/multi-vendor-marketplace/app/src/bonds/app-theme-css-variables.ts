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
    primary: '#d95030',
    primaryLight: '#fde8e3',
    primaryDark: '#b84228',
    secondary: '#2a9d8f',
    secondaryLight: '#d6f3ee',
    secondaryDark: '#1f7a6e',
    success: '#16a34a',
    successLight: '#dcfce7',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#dc2626',
    errorLight: '#fee2e2',
    info: '#7c3aed',
    infoLight: '#ede9fe',
    background: '#faf9f7',
    backgroundSecondary: '#fdf6f3',
    backgroundTertiary: '#f5f3ff',
    surface: '#ffffff',
    surfaceSecondary: '#faf9f7',
    border: '#e8e4e0',
    text: '#1a1a1a',
    textSecondary: '#525252',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
  },
}

const darkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#f07058',
    primaryLight: '#3a1f1a',
    primaryDark: '#d95030',
    secondary: '#5eead4',
    secondaryLight: '#0f3a34',
    secondaryDark: '#2a9d8f',
    info: '#a78bfa',
    infoLight: '#1e1a2e',
    background: '#121010',
    backgroundSecondary: '#1e1c1a',
    backgroundTertiary: '#2a2826',
    surface: '#1e1c1a',
    surfaceSecondary: '#2a2826',
    border: '#3a3632',
    text: '#f5f0eb',
    textSecondary: '#a8a29e',
    textTertiary: '#6b6661',
    textInverse: '#121010',
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
