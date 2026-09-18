/**
 * AppUiTailwind bond setup
 *
 * Wires @molecule/app-ui-tailwind to @molecule/app-ui, layering this app's
 * generated visual-token shorthand classes (`fv*` keys) on top.
 */

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { applyGeneratedVisualTokens } from '../../generatedVisualClassMap.js'

export function setupAppUiTailwind(): void {
  setClassMap(applyGeneratedVisualTokens(classMap))
}
