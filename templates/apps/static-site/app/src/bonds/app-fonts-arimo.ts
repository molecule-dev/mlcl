/**
 * AppFontsArimo bond setup
 *
 * Wires @molecule/app-fonts-arimo to @molecule/app-fonts
 */

import { setFont } from '@molecule/app-fonts'
import { font } from '@molecule/app-fonts-arimo'

// The site may be served under a sub-path (Vite `base`); local faces load
// from `<base>fonts/<file>`, so pass the base the app already knows.
export function setupAppFontsArimo(): void {
  setFont(font, { basePath: import.meta.env.BASE_URL })
}
