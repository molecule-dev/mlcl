import { defineConfig, loadEnv } from 'vite'

import { createDefaultViteConfig } from '@molecule/app-vite-config-default'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
import { stripPreviewBridgePlugin } from './vite-preview-bridge-plugin.js'

export default defineConfig(({ mode }) => {
  // The dev-server proxy target comes from VITE_API_URL in process.env; Vite
  // does not load app/.env into it for the config, so copy over what is unset.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  const config = createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })
  config.plugins = [...(config.plugins ?? []), stripPreviewBridgePlugin()]
  return config
})
