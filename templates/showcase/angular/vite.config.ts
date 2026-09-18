import { readdirSync } from 'node:fs'

import angular from '@analogjs/vite-plugin-angular'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.json' }), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    mainFields: ['module'],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
