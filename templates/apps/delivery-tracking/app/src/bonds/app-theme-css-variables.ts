/**
 * AppThemeCssVariables bond setup
 *
 * Parcel: navy primary + amber accent; mono font for tracking codes.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const waypointLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#1e40af',
    primaryLight: '#dbeafe',
    secondary: '#f59e0b',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626',
    info: '#0284c7',
    background: '#fafafa',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#e5e5e5',
    surface: '#ffffff',
    border: '#e5e5e5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
  },
}

const waypointDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#3b82f6',
    primaryLight: '#1e3a8a',
    primaryDark: '#1e40af',
    secondary: '#c4c4c4',
    background: '#0c1629',
    backgroundSecondary: '#131f3a',
    backgroundTertiary: '#1c2a47',
    surface: '#0c1629',
    surfaceSecondary: '#131f3a',
    inputBackground: '#080f1c',
    border: '#2a3a5c',
    borderSecondary: '#3a4a70',
    borderFocus: '#3b82f6',
    text: '#f1f5f9',
    textSecondary: '#c4cdd9',
    textTertiary: '#8a96aa',
    textInverse: '#0c1629',
    success: '#34d058',
    warning: '#f5b400',
    error: '#f25c5c',
    info: '#5ec0ff',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [waypointLightTheme, waypointDarkTheme],
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
