/**
 * AppStylingTailwind bond setup
 *
 * Wires @molecule/app-styling-tailwind to @molecule/app-styling
 */

import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'

export function setupAppStylingTailwind(): void {
  registerTailwindClassMerger()
}
