/**
 * AppThemeCssVariables bond setup
 *
 * Toolbelt: workwear-blue primary; cool-neutral dark surfaces for the
 * dispatch board.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const toolbeltLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1d4ed8',
    primaryLight: '#dbeafe',
    secondary: '#0f766e',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0369a1',
    background: '#eff6ff',
    backgroundSecondary: '#e7f0fe',
    backgroundTertiary: '#dbeafe',
    surface: '#ffffff',
    border: '#bfdbfe',
    text: '#1e3a8a',
    textSecondary: '#334e8a',
    textTertiary: '#4a6491',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [toolbeltLightTheme, darkTheme],
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
