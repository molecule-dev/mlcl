/**
 * AppThemeCssVariables bond setup
 *
 * MetroPulse: deep transit-teal primary (#0d5c63), departures-amber accent
 * (#e8a020). Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const metroPulseLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#0d5c63',
    primaryLight: '#d5ecea',
    secondary: '#3f6c9a',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#3f6c9a',
    background: '#f3f7f6',
    backgroundSecondary: '#e9f1f0',
    backgroundTertiary: '#dfeae9',
    surface: '#ffffff',
    border: '#e0e8e7',
    text: '#10201f',
    textSecondary: '#354645',
    textTertiary: '#667876',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [metroPulseLightTheme, darkTheme],
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
