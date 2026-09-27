/**
 * AppThemeCssVariables bond setup
 *
 * Bearing: forest-green primary; dispatch/ops cool-neutral dark surfaces.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const bearingLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#15803d',
    primaryLight: '#dcfce7',
    secondary: '#0369a1',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0369a1',
    background: '#f0fdf4',
    backgroundSecondary: '#e7faf0',
    backgroundTertiary: '#dcfce7',
    surface: '#ffffff',
    border: '#bbf7d0',
    text: '#14532d',
    textSecondary: '#2d6a42',
    textTertiary: '#4b7a5c',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [bearingLightTheme, darkTheme],
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
