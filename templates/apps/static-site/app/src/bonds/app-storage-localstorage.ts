/**
 * AppStorageLocalstorage bond setup
 *
 * Wires @molecule/app-storage-localstorage to @molecule/app-storage
 */

import { setProvider } from '@molecule/app-storage'
import { provider } from '@molecule/app-storage-localstorage'

export function setupAppStorageLocalstorage(): void {
  setProvider(provider)
}
