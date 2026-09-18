/**
 * AppTreeViewDefault bond setup
 *
 * Wires @molecule/app-tree-view-default to @molecule/app-tree-view
 */

import { setProvider } from '@molecule/app-tree-view'
import { provider } from '@molecule/app-tree-view-default'

export function setupAppTreeViewDefault(): void {
  setProvider(provider)
}
