/**
 * `npm run build` — writes the site into `dist/` and lists every file it wrote.
 *
 *   BASE_PATH=/blog SITE_URL=https://example.com npm run build
 *
 * A malformed post fails the build with the file named. `dist/` is the whole
 * deliverable: upload it to any static host as it is. `npm run build -- <dir>`
 * writes somewhere else (the dev server uses `.site-dev`).
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSite } from '../src/build.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, process.argv[2] ?? 'dist')
const started = Date.now()
try {
  const { files, posts, site } = await buildSite({ root, outDir })
  console.log(
    `Built ${posts.length} posts → ${files.length} files in ${outDir} (${Date.now() - started} ms)\n` +
      `base path ${site.basePath} · site URL ${site.siteUrl}`,
  )
  for (const file of files) console.log(`  ${file}`)
} catch (error) {
  console.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
