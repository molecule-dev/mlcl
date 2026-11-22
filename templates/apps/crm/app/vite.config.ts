import { defineConfig } from 'vite'

import { stripPreviewBridgePlugin } from '@molecule/app-e2e-preview/vite'
import { createDefaultViteConfig } from '@molecule/app-vite-config-default'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'

const config = createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })
config.plugins = [...(config.plugins ?? []), stripPreviewBridgePlugin()]

export default defineConfig(config)
