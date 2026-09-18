/**
 * AppThemeCssVariables bond setup
 *
 * Pylon — dark-first webhook manager. Emerald primary, indigo secondary.
 * See app/src/theme.css.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const pylonLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    secondary: '#6366f1',
    secondaryLight: '#818cf8',
    secondaryDark: '#4f46e5',
    background: '#f9fafb',
    surface: '#ffffff',
    border: '#e5e7eb',
    borderFocus: '#10b981',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

const pylonDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#10b981',
    primaryLight: '#0b3d2d',
    primaryDark: '#34d399',
    secondary: '#a5b4fc',
    secondaryLight: '#1e1b4b',
    secondaryDark: '#6366f1',
    success: '#34d399',
    successLight: '#0b3d2d',
    warning: '#fbbf24',
    warningLight: '#4a2d05',
    error: '#f87171',
    errorLight: '#4a1414',
    info: '#a5b4fc',
    infoLight: '#1e1b4b',
    background: '#0a0a0a',
    backgroundSecondary: '#141414',
    backgroundTertiary: '#1c1c1c',
    surface: '#0f0f0f',
    surfaceSecondary: '#1a1a1a',
    inputBackground: '#060606',
    border: '#262626',
    borderSecondary: '#383838',
    borderFocus: '#34d399',
    text: '#f5f5f5',
    textSecondary: '#b8b8b8',
    textTertiary: '#7a7a7a',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [pylonLightTheme, pylonDarkTheme],
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
