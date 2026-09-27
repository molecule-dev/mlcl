/**
 * AppThemeCssVariables bond setup
 *
 * Remit: dark teal primary + coral accent palette for invoice/billing.
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const defaultLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#0d7377',
    primaryLight: '#f0f9f9',
    secondary: '#e86c3a',
    secondaryLight: '#fef3c7',
    success: '#16804a',
    error: '#c42b2b',
    warning: '#d97706',
    info: '#0891b2',
    background: '#f0f9f9',
    surface: '#ffffff',
    border: '#e2e8f0',
    borderFocus: '#0d7377',
    text: '#1a1a2e',
    textSecondary: '#64748b',
    textTertiary: '#64748b', // raised from #94a3b8 (2.56:1 fail vs white) → 4.76:1
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [defaultLightTheme, darkTheme],
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
