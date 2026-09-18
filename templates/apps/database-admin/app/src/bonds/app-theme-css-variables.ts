/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 *
 * Quarry is a dark-by-default database power tool — every page is built
 * around dark surfaces with bright text. The bespoke palette lives here
 * (not in theme.css) because the theme provider sets `--mol-color-*`
 * inline on `:root` at runtime, which would otherwise override any dark
 * tokens declared inside `@theme` blocks.
 */

import { setProvider, type Theme } from '@molecule/app-theme'
import { createCSSVariablesThemeProvider, darkTheme } from '@molecule/app-theme-css-variables'

const quarryDarkTheme: Theme = {
  ...darkTheme,
  name: 'quarry-dark',
  mode: 'dark',
  colors: {
    background: '#010409',
    backgroundSecondary: '#0d1117',
    backgroundTertiary: '#161b22',
    surface: '#0d1117',
    surfaceSecondary: '#161b22',
    inputBackground: '#0d1117',

    text: '#e6edf3',
    textSecondary: '#7d8590',
    textTertiary: '#484f58',
    textInverse: '#0d1117',

    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    secondary: '#06b6d4',
    secondaryLight: '#22d3ee',
    secondaryDark: '#0891b2',

    success: '#10b981',
    successLight: '#064e3b',
    warning: '#f59e0b',
    warningLight: '#451a03',
    error: '#dc2626' /* was #ef4444; white text fails (3.76:1); #dc2626 gives 4.83:1 */,
    errorLight: '#450a0a',
    info: '#06b6d4',
    infoLight: '#083344',

    border: '#21262d',
    borderSecondary: '#30363d',
    borderFocus: '#10b981',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.4)',
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
  themes: [quarryDarkTheme],
  defaultTheme: 'quarry-dark',
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
