import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.js'

// Keep the routing bond in Vite's graph so workspace links use the app's
// deduplicated React and React Router contexts, just as the browser build does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: { server: { deps: { inline: ['@molecule/app-routing-react-router'] } } },
  }),
)
