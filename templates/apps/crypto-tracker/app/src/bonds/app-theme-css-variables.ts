/**
 * AppThemeCssVariables bond setup
 *
 * Sigil: amber-primary, violet-accent palette tuned for numeric-dense
 * trading dashboards. Light mode by default.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const sigilLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#f59e0b',
    primaryLight: '#fef3c7',
    secondary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#fafaf9',
    backgroundSecondary: '#f5f5f4',
    backgroundTertiary: '#e7e5e4',
    surface: '#ffffff',
    border: '#e7e5e4',
    text: '#1c1917',
    textSecondary: '#57534e',
    textTertiary: '#a8a29e',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [sigilLightTheme, darkTheme],
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
