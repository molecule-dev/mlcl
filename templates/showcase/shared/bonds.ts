/**
 * Minimal bond setup for the component showcase.
 *
 * Wires only the bonds needed for visual rendering:
 * - ClassMap (Tailwind) for CSS class resolution
 * - Theme (CSS variables) for color tokens
 * - Icons for components that render icons (Alert, etc.)
 */

import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setProvider as setThemeProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-showcase-theme',
})

// Initialize bonds at module level (not deferred to a function) so the
// ClassMap is available before any component module evaluates.  ES module
// evaluation follows import order, so as long as main.ts imports this
// file before importing the Showcase component, the bonds are ready.
setClassMap(classMap)
setThemeProvider(themeProvider)
setIconSet(iconSet)
