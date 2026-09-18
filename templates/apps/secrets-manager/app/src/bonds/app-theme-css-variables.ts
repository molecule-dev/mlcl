/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 *
 * Arcanum is a dark-by-default secrets vault for developers. Per
 * DESIGN.md the brand is emerald primary (`#00d992`) with violet accent
 * (`#a78bfa`) over deep navy surfaces. The bespoke palette lives here
 * (not in theme.css) because the theme provider sets `--mol-color-*`
 * inline on `:root` at runtime, which would otherwise override values
 * declared inside `@theme` blocks.
 */

import { setProvider, type Theme } from '@molecule/app-theme'
import { createCSSVariablesThemeProvider, darkTheme } from '@molecule/app-theme-css-variables'

const arcanumDarkTheme: Theme = {
  ...darkTheme,
  name: 'arcanum-dark',
  mode: 'dark',
  colors: {
    background: '#0c1222',
    backgroundSecondary: '#111a2e',
    backgroundTertiary: '#182338',
    surface: '#1a2540',
    surfaceSecondary: '#1f2d4a',
    inputBackground: '#0f1829',

    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    textInverse: '#0c1222',

    primary: '#00d992',
    primaryLight: '#33e6ad',
    primaryDark: '#00b377',
    secondary: '#a78bfa',
    secondaryLight: '#c4b5fd',
    secondaryDark: '#7c3aed',

    success: '#00d992',
    successLight: '#064e3b',
    warning: '#facc15',
    warningLight: '#451a03',
    error: '#ef4444',
    errorLight: '#450a0a',
    info: '#60a5fa',
    infoLight: '#0c2858',

    border: '#1e3048',
    borderSecondary: '#293d5a',
    borderFocus: '#00d992',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  typography: {
    ...darkTheme.typography,
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: '"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
  },
}

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [arcanumDarkTheme],
  defaultTheme: 'arcanum-dark',
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
