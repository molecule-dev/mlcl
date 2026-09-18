/**
 * AppGalleryPhotoswipe bond setup
 *
 * Wires @molecule/app-gallery-photoswipe to @molecule/app-gallery
 */

import { setProvider } from '@molecule/app-gallery'
import { provider } from '@molecule/app-gallery-photoswipe'

export function setupAppGalleryPhotoswipe(): void {
  setProvider(provider)
}
