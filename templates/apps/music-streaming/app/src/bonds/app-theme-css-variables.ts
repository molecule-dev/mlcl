/**
 * AppThemeCssVariables bond setup
 *
 * Reverb: Spotify-green primary + dark surfaces; persistent dark now-playing dock.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const reverbLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#15883e',
    primaryLight: '#d1fae5',
    primaryDark: '#117432',
    secondary: '#f5f5f5',
    success: '#15883e',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#e5e5e5',
    surface: '#ffffff',
    border: '#e4e4e4',
    text: '#121212',
    textSecondary: '#4d4d4d',
    textTertiary: '#8a8a8a',
    textInverse: '#ffffff',
  },
}

const reverbDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#1ed760',
    primaryLight: '#1ed76022',
    primaryDark: '#1aa34a',
    secondary: '#0a0a0a',
    background: '#000000',
    backgroundSecondary: '#0c0c0c',
    backgroundTertiary: '#1a1a1a',
    surface: '#121212',
    surfaceSecondary: '#1f1f1f',
    inputBackground: '#0a0a0a',
    border: '#2a2a2a',
    borderSecondary: '#3a3a3a',
    borderFocus: '#1ed760',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    textTertiary: '#7a7a7a',
    textInverse: '#000000',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [reverbLightTheme, reverbDarkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
  storage: typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined,
})

export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
