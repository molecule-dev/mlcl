/**
 * AppThemeCssVariables bond setup
 *
 * Cadence: Todoist-red primary + blue info accent.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const cadenceLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#dc4c3e',
    primaryLight: '#fef2f1',
    secondary: '#246fe0',
    success: '#058527',
    warning: '#eb8909',
    error: '#d1453b',
    info: '#246fe0',
    background: '#ffffff',
    backgroundSecondary: '#fafafa',
    backgroundTertiary: '#f5f5f5',
    surface: '#fafafa',
    border: '#e0e0e0',
    text: '#202020',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [cadenceLightTheme, darkTheme],
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
