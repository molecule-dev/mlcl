import { readdirSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    // One module identity per @molecule package (see moleculePackages above):
    // two identities mean two bond registries.
    dedupe: ['vue', ...moleculePackages],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
