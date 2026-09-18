/**
 * Aggregated English translation surface.
 *
 * Re-exports the per-domain `en/` files (UI, privacy policy, terms of
 * service) under a single object so consumers can do
 * `import en from './locales/en.js'` without needing to know the
 * sub-file layout. The verify gate (G17) requires this aggregated entry
 * to exist alongside the per-domain `en/` directory.
 */

import { privacyPolicy } from './en/privacyPolicy.js'
import { termsOfService } from './en/termsOfService.js'
import { ui } from './en/ui.js'

const en = {
  // Pricing — Phase 2 keys for the Pricing page (merged into UI at runtime).
  pricing: {
    heading: 'Choose your {{appName}} plan',
    galleryLimit: '{{count}} gallery',
    generationsLimit: '{{count}} generations',
    advancedFeatures: 'Advanced features',
    dataExport: 'Data export',
  },
  // Generations — error/state strings emitted by the API + Generate page.
  generations: {
    promptRequired: 'Prompt is required',
    notFound: 'Generation not found',
    failed: 'Generation failed',
  },
  // Gallery — strings used by Gallery / ImageDetail.
  gallery: {
    notFound: 'Image not found',
    favoriteAdded: 'Added to favorites',
    favoriteRemoved: 'Removed from favorites',
    visibilityPublic: 'Image is now public',
    visibilityPrivate: 'Image is now private',
  },
  // Re-exports of the per-domain bundles for consumers that need
  // structured access (e.g. Footer modal renderers).
  ui,
  privacyPolicy,
  termsOfService,
}

export default en
export { privacyPolicy, termsOfService, ui }
