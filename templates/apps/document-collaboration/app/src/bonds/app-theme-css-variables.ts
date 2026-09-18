/**
 * AppThemeCssVariables bond setup
 *
 * Quillon: Google-Docs–inspired blue (#1a73e8) primary; cool-gray surfaces.
 * Uses #1a73e8 (4.51:1 on white) instead of #4285f4 (3.56:1) so CTA labels pass.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const quillonLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1a73e8' /* darkened from #4285f4 for 4.51:1 on white */,
    primaryLight: '#e8f0fe',
    primaryDark: '#1558c0',
    secondary: '#5f6368',
    background: '#f8f9fa',
    backgroundSecondary: '#f1f3f4',
    backgroundTertiary: '#e8eaed',
    surface: '#ffffff',
    border: '#dadce0',
    text: '#202124',
    textSecondary: '#5f6368',
    textTertiary: '#80868b',
    textInverse: '#ffffff',
    success: '#34a853',
    warning: '#fbbc04',
    error: '#c5221f' /* darkened for 4.5:1 on white in light mode */,
    info: '#1a73e8',
  },
}

const quillonDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#1a73e8' /* brand stop — 4.51:1 on white */,
    primaryLight: '#1a3a6c',
    primaryDark: '#1558c0',
    secondary: '#9aa0a6',
    background: '#1b1c1e',
    backgroundSecondary: '#1f2123',
    backgroundTertiary: '#25272a',
    surface: '#1b1c1e',
    surfaceSecondary: '#1f2123',
    border: '#3c4043',
    text: '#e8eaed',
    textSecondary: '#bdc1c6',
    textTertiary: '#80868b',
    textInverse: '#1b1c1e',
    success: '#81c995',
    warning: '#fdd663',
    error: '#f28b82',
    info: '#8ab4f8',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [quillonLightTheme, quillonDarkTheme],
  defaultTheme: 'light',
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
