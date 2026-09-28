/**
 * AppThemeCssVariables bond setup
 *
 * Wavelength: broadcast orange primary on warm paper (light) / warm stone
 * (dark), per reference/flagship-apps-designs/design-podcast-landing.html.
 * Deep orange #c2410c carries white text at 5.18:1; the brighter brand
 * orange (#e8540a light / #f36b21 dark) is reserved for large/decorative
 * accents. The design defaults to light, so the app boots light now.
 */

import type { Theme } from '@molecule/app-theme'
import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme as baseDarkTheme,
  lightTheme as baseLightTheme,
} from '@molecule/app-theme-css-variables'

const wavelengthLightTheme: Theme = {
  ...baseLightTheme,
  name: 'light',
  mode: 'light',
  colors: {
    ...baseLightTheme.colors,
    primary: '#c2410c',
    primaryLight: '#ffedd5',
    primaryDark: '#9a3412',
    secondary: '#1c1917',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
    background: '#faf9f7',
    backgroundSecondary: '#f3f2ef',
    backgroundTertiary: '#ebe9e6',
    surface: '#ffffff',
    border: '#e7e5e4',
    text: '#1c1917',
    textSecondary: '#57534e',
    textTertiary: '#78716c',
    textInverse: '#ffffff',
  },
}

const wavelengthDarkTheme: Theme = {
  ...baseDarkTheme,
  name: 'dark',
  mode: 'dark',
  colors: {
    ...baseDarkTheme.colors,
    primary: '#f36b21',
    primaryLight: '#431407',
    primaryDark: '#c2410c',
    secondary: '#b3b3b3',
    background: '#0a0a0a',
    backgroundSecondary: '#141414',
    backgroundTertiary: '#1c1c1c',
    surface: '#181818',
    surfaceSecondary: '#232323',
    inputBackground: '#121212',
    border: '#2a2a2a',
    borderSecondary: '#383838',
    borderFocus: '#f36b21',
    text: '#ffffff',
    textSecondary: '#c2c2c2',
    textTertiary: '#808080',
    textInverse: '#000000',
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [wavelengthLightTheme, wavelengthDarkTheme],
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
