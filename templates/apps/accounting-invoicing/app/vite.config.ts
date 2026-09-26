import { defineConfig } from 'vite'

import { createDefaultViteConfig } from '@molecule/app-vite-config-default'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
import { stripPreviewBridgePlugin } from './vite-preview-bridge-plugin.js'

const config = createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })
config.plugins = [...(config.plugins ?? []), stripPreviewBridgePlugin()]

// Pre-bundle the molecule icon-set package. The default config excludes every
// @molecule/* dep because bond state lives in module-level singletons, but
// this package is pure data — 89 icon records, zero imports (same class as
// the app-locales-* bonds the factory already force-includes for the same
// reason). Served unbundled it fans out into ~96 dev-server module requests
// on every page load; it was the largest reducible share of the request
// storm that exhausted the browser's request budget on /invoices/new
// (net::ERR_INSUFFICIENT_RESOURCES, 2026-09-26 flagship audit). Exclude wins
// over include in Vite, so it must be dropped from the exclusion list too.
config.optimizeDeps.exclude = (config.optimizeDeps.exclude ?? []).filter(
  (name) => name !== '@molecule/app-icons-molecule',
)
config.optimizeDeps.include = [
  ...(config.optimizeDeps.include ?? []),
  '@molecule/app-icons-molecule',
]

export default defineConfig(config)
