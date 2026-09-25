/**
 * `npm run preview` — serves the built `dist/` exactly as a static host would
 * (index.html per directory, 404.html for unknown paths, only under BASE_PATH).
 * Run `npm run build` first.
 */
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defaultPort, serveDirectory } from '../src/serve.js'
import { createSite } from '../src/site.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('No build in dist/ — run `npm run build` first.')
  process.exit(1)
}
const site = createSite()
const port = defaultPort()
await serveDirectory({ dir: () => dist, basePath: site.basePath, port })
console.log(`[preview] serving dist/ at http://localhost:${port}${site.basePath}`)
