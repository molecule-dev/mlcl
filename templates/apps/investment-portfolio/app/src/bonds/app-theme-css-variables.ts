/**
 * AppThemeCssVariables bond setup
 *
 * Argent: teal primary on a navy sidebar (sidebar uses raw hex via theme.css).
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const argentLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#0d9488',
    primaryLight: '#ccfbf1',
    secondary: '#0f172a',
    success: '#16a34a',
    warning: '#eab308',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#e5e5e5',
    surface: '#ffffff',
    border: '#e5e5e5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b', // raised from #94a3b8 (2.56:1 fail) → 4.76:1
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [argentLightTheme, darkTheme],
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
