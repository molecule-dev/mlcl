/**
 * AppThemeCssVariables bond setup
 *
 * Snagr: vivid orange primary + green savings accent.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const snagrLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#e8501c',
    primaryLight: '#fed7aa',
    secondary: '#16a34a',
    success: '#16a34a',
    warning: '#e0a020',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#e5e5e5',
    surface: '#ffffff',
    border: '#e5e5e5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [snagrLightTheme, darkTheme],
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
