/**
 * AppFontsArimo bond setup
 *
 * Wires @molecule/app-fonts-arimo to @molecule/app-fonts
 */

import { setFont } from '@molecule/app-fonts'
import { font } from '@molecule/app-fonts-arimo'

export function setupAppFontsArimo(): void {
  setFont(font)
}
