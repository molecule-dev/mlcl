/**
 * AppThemeCssVariables bond setup
 *
 * Lectura: violet primary + warm-neutral canvas.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const lecturaLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#a435f0',
    primaryLight: '#ede0ff',
    secondary: '#5624d0',
    success: '#1e6c4a',
    warning: '#b4690e',
    error: '#c4302b',
    info: '#0284c7',
    background: '#f7f9fa',
    backgroundSecondary: '#f0f2f5',
    backgroundTertiary: '#e5e7ea',
    surface: '#ffffff',
    border: '#d1d7dc',
    text: '#1c1d1f',
    textSecondary: '#6a6f73',
    textTertiary: '#a0a4a8',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lecturaLightTheme, darkTheme],
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
