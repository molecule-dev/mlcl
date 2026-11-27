import { readdirSync } from 'node:fs'

import angular from '@analogjs/vite-plugin-angular'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  // Surface Angular diagnostics before Vite serves a component without an Ivy definition.
  plugins: [angular({ tsconfig: './tsconfig.json', disableTypeChecking: false }), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    mainFields: ['module'],
    // One module identity per @molecule package (see moleculePackages above):
    // two identities mean two bond registries.
    dedupe: [...moleculePackages],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
