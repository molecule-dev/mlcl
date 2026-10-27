import { existsSync, readdirSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'

const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

/**
 * @molecule/app-ui-solid compiles with `jsx: "preserve"`, producing .jsx
 * files. However TypeScript barrel exports emit .js specifiers. Vite follows
 * the ES module spec and won't auto-resolve .js → .jsx. This plugin handles
 * that specific case for @molecule/app-ui-solid's component files.
 */
function resolveSolidJsx(): Plugin {
  return {
    name: 'resolve-molecule-solid-jsx',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith('.js') || !importer?.includes('@molecule/app-ui-solid')) {
        return null
      }

      // Build the absolute path from the importer's directory
      const importerDir = importer.replace(/\/[^/]+$/, '')
      const candidate = `${importerDir}/${source.replace(/\.js$/, '.jsx')}`

      if (existsSync(candidate)) {
        return candidate
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [resolveSolidJsx(), solid(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    // One module identity per @molecule package (see moleculePackages above):
    // two identities mean two bond registries.
    dedupe: ['solid-js', ...moleculePackages],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
