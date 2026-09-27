/**
 * AppThemeCssVariables bond setup
 *
 * Skylark: midnight-navy primary (#1e3a5f), orange accent (#e86a2e).
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const skylarkLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1e3a5f',
    primaryLight: '#dbeafe',
    secondary: '#2a5298',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2a5298',
    background: '#f4f7fb',
    backgroundSecondary: '#eef3fa',
    backgroundTertiary: '#e4ecf5',
    surface: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    textSecondary: '#374151',
    textTertiary: '#6b7280',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [skylarkLightTheme, darkTheme],
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
