/**
 * AppThemeCssVariables bond setup
 *
 * Reverb: Sonic Noir palette (Stitch design set) — light violet primary +
 * rose secondary on near-black violet-tinted surfaces; persistent dark
 * now-playing dock.
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
    primary: '#6d28d9',
    primaryLight: '#ede9fe',
    primaryDark: '#5b21b6',
    secondary: '#e5195f',
    success: '#15883e',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f2f2f6',
    backgroundTertiary: '#ebebf0',
    surface: '#ffffff',
    surfaceSecondary: '#f7f7fa',
    inputBackground: '#ffffff',
    border: '#e4e4e7',
    borderSecondary: '#d4d4d9',
    borderFocus: '#6d28d9',
    text: '#1a191c',
    textSecondary: '#52505a',
    textTertiary: '#6e6c76',
    textInverse: '#ffffff',
  },
}

const reverbDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#bd9dff',
    primaryLight: '#bd9dff22',
    primaryDark: '#a67aff',
    secondary: '#ff6f7e',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ff6e84',
    info: '#67e8f9',
    background: '#0e0e10',
    backgroundSecondary: '#131315',
    backgroundTertiary: '#19191c',
    surface: '#0e0e10',
    surfaceSecondary: '#19191c',
    inputBackground: '#0a0a0c',
    border: '#262528',
    borderSecondary: '#3a393d',
    borderFocus: '#bd9dff',
    text: '#f9f5f8',
    textSecondary: '#adaaad',
    textTertiary: '#8a888c',
    textInverse: '#0e0e10',
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
