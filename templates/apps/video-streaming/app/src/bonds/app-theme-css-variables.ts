/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Dark-first video streaming brand (red primary on near-black surface).
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const streamingLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#cc0000',
    primaryLight: '#fff1f1',
    primaryDark: '#a30000',
    secondary: '#f2f2f2',
    background: '#ffffff',
    backgroundSecondary: '#f9f9f9',
    backgroundTertiary: '#f2f2f2',
    surface: '#ffffff',
    surfaceSecondary: '#f4f4f4',
    border: '#e5e5e5',
    text: '#0f0f0f',
    textSecondary: '#606060',
    textTertiary: '#909090',
    textInverse: '#ffffff',
  },
}

const streamingDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#ff3b3b',
    primaryLight: '#3d0f0f',
    primaryDark: '#cc0000',
    secondary: '#aaaaaa',
    background: '#050505',
    backgroundSecondary: '#0f0f0f',
    backgroundTertiary: '#1a1a1a',
    surface: '#1a1a1a',
    surfaceSecondary: '#262626',
    inputBackground: '#0f0f0f',
    border: '#2e2e2e',
    borderSecondary: '#3f3f3f',
    borderFocus: '#ff3b3b',
    text: '#f5f5f5',
    textSecondary: '#b8b8b8',
    textTertiary: '#7a7a7a',
    textInverse: '#050505',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [streamingLightTheme, streamingDarkTheme],
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
