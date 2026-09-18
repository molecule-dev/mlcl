/**
 * AppThemeCssVariables bond setup
 *
 * Wavelength: burgundy primary; persistent dark now-playing dock.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const wavelengthLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#9f1239',
    primaryLight: '#ffe4e6',
    primaryDark: '#7f0f2d',
    secondary: '#1a1a1a',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#eeeeee',
    surface: '#ffffff',
    border: '#e4e4e4',
    text: '#1a1a1a',
    textSecondary: '#4a4a4a',
    textTertiary: '#7d7d7d',
    textInverse: '#ffffff',
  },
}

const wavelengthDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#fb7185',
    primaryLight: '#4a0e1e',
    primaryDark: '#9f1239',
    secondary: '#b3b3b3',
    background: '#0a0a0a',
    backgroundSecondary: '#141414',
    backgroundTertiary: '#1c1c1c',
    surface: '#181818',
    surfaceSecondary: '#232323',
    inputBackground: '#121212',
    border: '#2a2a2a',
    borderSecondary: '#383838',
    borderFocus: '#fb7185',
    text: '#ffffff',
    textSecondary: '#c2c2c2',
    textTertiary: '#808080',
    textInverse: '#000000',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [wavelengthLightTheme, wavelengthDarkTheme],
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
