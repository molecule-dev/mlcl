import { readdirSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Discover all @molecule/* packages to exclude from pre-bundling.
// Bond state (setClassMap/getClassMap) uses module-level singletons via
// @molecule/app-bond — pre-bundling can create duplicate module instances.
const moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: moleculePackages,
  },
})
