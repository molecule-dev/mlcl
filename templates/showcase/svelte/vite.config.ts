import { readdirSync } from 'node:fs'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Discover all @molecule/* packages to exclude from pre-bundling.
// Bond state (setClassMap/getClassMap) uses module-level singletons via
// @molecule/app-bond — pre-bundling can create duplicate module instances.
const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    // One module identity per @molecule package (see moleculePackages above):
    // two identities mean two bond registries.
    dedupe: [...moleculePackages],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
