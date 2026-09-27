/**
 * AppThemeCssVariables bond setup
 *
 * Hush: brand teal primary + green secondary; warm parchment-chat palette for private messaging.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const hushLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#075e54',
    primaryLight: '#dcf8c6',
    secondary: '#25d366',
    success: '#25d366',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#027eb5',
    background: '#efeae2',
    backgroundSecondary: '#f0f2f5',
    backgroundTertiary: '#e9edef',
    surface: '#ffffff',
    border: '#e9edef',
    text: '#111b21',
    textSecondary: '#667781',
    textTertiary: '#aebac1',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [hushLightTheme, darkTheme],
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
