import { readdirSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    dedupe: ['vue'],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
