/**
 * AppThemeCssVariables bond setup
 *
 * Vellum: navy primary on a light parchment-tinted canvas with seal-gold
 * accent. Sidebar styled in theme.css for the dark navy variant.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const vellumLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1e3a5f',
    primaryLight: '#dbeafe',
    secondary: '#c49a2a',
    success: '#15803d',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafaf7',
    backgroundSecondary: '#f5f5f0',
    backgroundTertiary: '#eaeae5',
    surface: '#ffffff',
    border: '#e5e5e0',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [vellumLightTheme, darkTheme],
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
