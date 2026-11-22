import { {{VITE_NAMES}} } from 'vite'
import { {{E2E_PREVIEW_NAMES}} } from '@molecule/app-e2e-preview/vite'
import { createFrameworkViteConfig } from '@molecule/app-vite-config-default/framework'
{{PLUGIN_IMPORTS}}import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from '{{BRANDING_IMPORT}}'

// Molecule's Vite config for this app's framework (@molecule/app-vite-config-default):
// the PWA, one module identity per @molecule package, the dev server and `vite preview`
// proxy for /api, /health and /socket.io, and the VITE_* env conventions its README lists.
const branding = { APP_NAME, APP_DESCRIPTION, BRAND_COLOR }
const config = createFrameworkViteConfig(branding, {
{{VITE_PLUGINS}}{{SVELTE_KIT_OPTION}}
  warmup: {{WARMUP_CLIENT_FILES}},
})
// The molecule.dev IDE preview bridges in dev; a production build carries none of them.
config.plugins = [...(config.plugins ?? []), {{STRIP_PREVIEW_BRIDGES}}]

{{CONFIG_EXPORT}}
