import { defineConfig } from 'vite'

import { createDefaultViteConfig } from '@molecule/app-vite-config-default'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
import { stripPreviewBridgePlugin } from './vite-preview-bridge-plugin.js'

const config = createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })
config.plugins = [...(config.plugins ?? []), stripPreviewBridgePlugin()]

export default defineConfig(config)
