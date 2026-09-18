/**
 * AppIconsMolecule bond setup
 *
 * Wires @molecule/app-icons-molecule to @molecule/app-icons
 */

import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'

export function setupAppIconsMolecule(): void {
  setIconSet(iconSet)
}
