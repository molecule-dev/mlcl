/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Sterling uses light canvas + dark navy sidebar (sidebar styled inline).
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const meridianLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1e40af',
    primaryLight: '#dbeafe',
    secondary: '#0f766e',
    success: '#15803d',
    warning: '#b45309',
    error: '#b91c1c',
    info: '#1a73e8',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#eeeeee',
    surface: '#ffffff',
    border: '#e5e7eb',
    text: '#1f2937',
    textSecondary: '#4b5563',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [meridianLightTheme, darkTheme],
  defaultTheme: 'light',
  persistKey: 'molecule-theme',
  // Wire localStorage so the user's chosen mode survives reloads. Without
  // a storage adapter the persistKey is effectively a no-op and every
  // page load renders the default theme.
  storage:
    typeof globalThis !== 'undefined' && globalThis.localStorage
      ? {
          getItem: (key: string): string | null => globalThis.localStorage.getItem(key),
          setItem: (key: string, value: string): void => {
            globalThis.localStorage.setItem(key, value)
          },
        }
      : undefined,
})
export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
