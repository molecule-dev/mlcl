#!/usr/bin/env node
/**
 * Prerender — turns the client build into a static site, in Node, with no
 * browser. Runs after `vite build` (see the `build` script in package.json).
 *
 * 1. Bundles src/entry-server.tsx with Vite's SSR build (the same config and
 *    the same @molecule/* packages as the client bundle) and imports it.
 * 2. For every path `getStaticPaths()` returns, calls `render(path)` and
 *    writes the markup into the client shell (`dist/index.html`): the `#root`
 *    body, `<title>`, the description metas and any extra `<head>` markup the
 *    page asks for. `/` becomes `dist/index.html`; `/about/` becomes
 *    `dist/about/index.html`, so every static host serves it at `/about/`.
 * 3. Writes every file `getStaticFiles()` returns (feeds, sitemap, llms.txt,
 *    JSON, raw markdown) to the same path under `dist/`.
 *
 * The SPA bundle still loads on every page and hydrates the markup, so the
 * site behaves exactly as in dev; crawlers and the first paint get real HTML.
 *
 * BASE_PATH only changes the URLs inside the pages (Vite's `base`); files are
 * always written relative to `dist/`, because a host serves `dist/` at the
 * base path. A page whose markup is empty fails the build: an empty page is
 * never a valid static page.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { build } from 'vite'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(appRoot, 'dist')
const SSR_OUT = join(appRoot, 'node_modules', '.cache', 'mol-prerender')

/** Bundle the server entry with the app's own Vite config and import it. */
async function loadEntry() {
  await build({
    configFile: join(appRoot, 'vite.config.ts'),
    root: appRoot,
    logLevel: 'error',
    build: {
      ssr: join(appRoot, 'src', 'entry-server.tsx'),
      outDir: SSR_OUT,
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
      sourcemap: false,
    },
  })
  const file = join(SSR_OUT, 'entry-server.js')
  if (!existsSync(file)) throw new Error(`prerender: the SSR build produced no ${file}`)
  return import(pathToFileURL(file).href)
}

/** `/` → dist/index.html, `/about/` → dist/about/index.html, `/x.md` → dist/x.md. */
function outputFileFor(sitePath) {
  if (sitePath === '/') return join(DIST, 'index.html')
  const relative = sitePath.replace(/^\/+/, '')
  if (/\.[a-z0-9]+$/i.test(relative)) return join(DIST, relative)
  return join(DIST, relative.replace(/\/+$/, ''), 'index.html')
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Put one rendered page into the client shell. */
function injectPage(shell, page) {
  const rootTag = /<div id="root"><\/div>/
  if (!rootTag.test(shell)) {
    throw new Error('prerender: dist/index.html has no empty <div id="root"></div> to fill')
  }
  let html = shell.replace(rootTag, () => `<div id="root">${page.html}</div>`)
  if (page.title) {
    const title = escapeText(page.title)
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
    for (const name of ['og:title', 'twitter:title']) {
      html = html.replace(
        new RegExp(`(<meta (?:property|name)="${name}" content=")[^"]*(")`),
        (_m, open, close) => `${open}${escapeAttr(page.title)}${close}`,
      )
    }
  }
  if (page.description) {
    for (const name of ['description', 'og:description', 'twitter:description']) {
      html = html.replace(
        new RegExp(`(<meta (?:property|name)="${name}" content=")[^"]*(")`),
        (_m, open, close) => `${open}${escapeAttr(page.description)}${close}`,
      )
    }
  }
  if (page.head) html = html.replace('</head>', () => `${page.head}\n  </head>`)
  return html
}

async function writeOutput(sitePath, content) {
  const file = outputFileFor(sitePath)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
  return file
}

async function main() {
  const shellPath = join(DIST, 'index.html')
  if (!existsSync(shellPath)) {
    throw new Error(`prerender: ${shellPath} is missing — run \`vite build\` first`)
  }
  const shell = await readFile(shellPath, 'utf8')
  const entry = await loadEntry()

  const paths = await entry.getStaticPaths()
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('prerender: getStaticPaths() returned no routes')
  }
  const seen = new Set()
  for (const sitePath of paths) {
    if (seen.has(sitePath)) throw new Error(`prerender: route listed twice: ${sitePath}`)
    seen.add(sitePath)
    const page = await entry.render(sitePath)
    if (!page || typeof page.html !== 'string' || !page.html.trim()) {
      throw new Error(`prerender: ${sitePath} rendered no markup`)
    }
    await writeOutput(sitePath, injectPage(shell, page))
  }

  const files = await entry.getStaticFiles()
  for (const file of files) {
    if (seen.has(file.path)) throw new Error(`prerender: ${file.path} is both a route and a file`)
    seen.add(file.path)
    await writeOutput(file.path, file.content)
  }

  console.log(`prerender: ${paths.length} page(s) + ${files.length} file(s) → ${DIST}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
