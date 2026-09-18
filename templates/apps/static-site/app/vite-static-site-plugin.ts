import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { type InjectedPage, injectPage } from './scripts/inject-page.mjs'

/**
 * One non-HTML file the site publishes: a feed, a sitemap, `llms.txt`, a
 * JSON index, the raw markdown of a post. `path` is site-relative and starts
 * with `/` (`/feed.xml`); `withBase()` in src/site.ts turns it into a link.
 *
 * src/entry-server.tsx returns the full list from `getStaticFiles()`:
 * `npm run build` writes each one into `dist/` (scripts/prerender.mjs) and
 * `npm run dev` serves them live through this plugin, so a feed you can
 * open in the dev server is the feed the build ships.
 */
export interface StaticFile {
  /** Site-relative path with a leading slash, e.g. `/feed.xml`. */
  path: string
  /** The file's full text. */
  content: string
  /** Overrides the content type derived from the extension. */
  contentType?: string
}

/** What src/entry-server.tsx exports, as the dev server calls it. */
interface StaticSiteEntry {
  getStaticPaths: () => string[] | Promise<string[]>
  getStaticFiles: () => StaticFile[] | Promise<StaticFile[]>
  render: (path: string) => InjectedPage | Promise<InjectedPage>
}

const CONTENT_TYPES: Record<string, string> = {
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

/** The content type to serve a static file with, from its extension. */
export function contentTypeFor(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase()
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

/** The extensions this plugin answers for in dev — everything else is Vite's. */
const SERVED = /\.(xml|json|txt|md)$/i

/**
 * The client shell with the failure named in the page's console (and the
 * terminal) — served in place of a page the server could not render, so the
 * preview and its bridges stay alive while the cause is fixed.
 */
function prerenderFailedShell(shell: string, sitePath: string, error: unknown): string {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
  const line =
    `[static-site] ${sitePath} could not be prerendered — serving the client shell instead. ` +
    `\`npm run build\` fails on this until it is fixed. ${detail}`
  console.error(line)
  const script = `<script>console.error(${JSON.stringify(line).replace(/<\//g, '<\\/')})</script>`
  return shell.includes('</head>') ? shell.replace('</head>', `${script}\n</head>`) : script + shell
}

/** A request for a document, by the rule Vite's own HTML fallback applies. */
const wantsHtml = (accept: string | undefined): boolean =>
  accept === undefined || accept === '*/*' || accept.includes('text/html')

/**
 * Dev-server half of the static-site pipeline. Two things, both through Vite's
 * SSR loader so editing content or a component shows up on reload:
 *
 * - Every route `getStaticPaths()` lists is served PRERENDERED — the markup
 *   `render(path)` returns, in the shell, exactly as scripts/prerender.mjs
 *   writes it into `dist/`. The client then hydrates it in the preview the way
 *   it hydrates on the host, so a hydration mismatch (a component whose client
 *   render differs from its server render) shows here, in the console the IDE
 *   reads and in the e2e specs, instead of only after `npm run build`. A path
 *   the entry does not list (the not-found page) falls through to Vite's
 *   shell, where the app mounts from scratch.
 * - Every file `getStaticFiles()` returns is served on the path it will have
 *   in `dist/`, under the configured `base`.
 */
export function staticSitePlugin(): Plugin {
  return {
    name: 'molecule-static-site',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const base = server.config.base
      const shellPath = join(server.config.root, 'index.html')
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = (req.url ?? '/').split('?')[0] ?? '/'
        if (!url.startsWith(base)) return next()
        const sitePath = `/${url.slice(base.length)}`
        const isFile = SERVED.test(sitePath)
        if (!isFile && (/\.[a-z0-9]+$/i.test(sitePath) || !wantsHtml(req.headers.accept))) {
          return next()
        }
        server
          .ssrLoadModule('/src/entry-server.tsx')
          .then(async (mod) => {
            const entry = mod as StaticSiteEntry
            if (isFile) {
              const files = await entry.getStaticFiles()
              const hit = files.find((file) => file.path === sitePath)
              if (!hit) {
                next()
                return
              }
              res.setHeader('content-type', hit.contentType ?? contentTypeFor(hit.path))
              res.end(hit.content)
              return
            }
            const paths = await entry.getStaticPaths()
            if (!paths.includes(sitePath)) {
              next()
              return
            }
            const shell = await server.transformIndexHtml(
              url,
              await readFile(shellPath, 'utf8'),
              req.originalUrl,
            )
            let html: string
            try {
              html = injectPage(shell, await entry.render(sitePath))
            } catch (error) {
              // The page could not be rendered on the server — a component that
              // throws during render, a data file missing. `npm run build` fails
              // on exactly this; in dev the preview must stay usable, so serve
              // the client shell (the app mounts from scratch, and the same error
              // shows in the browser if it is a client one) and say so in BOTH
              // consoles. The prerendered-arrival spec (e2e/home.spec.ts) fails
              // while this fallback is in effect, so it cannot pass unnoticed.
              html = prerenderFailedShell(shell, sitePath, error)
            }
            res.setHeader('content-type', 'text/html; charset=utf-8')
            res.end(html)
          })
          .catch((error: unknown) => {
            // The entry itself would not load (a compile error in a component the
            // server render imports): serve the client shell so the preview and
            // its bridges stay alive — Vite's client shows the compile error in
            // its overlay, and the console line below names the path.
            readFile(shellPath, 'utf8')
              .then((raw) => server.transformIndexHtml(url, raw, req.originalUrl))
              .then((shell) => {
                res.setHeader('content-type', 'text/html; charset=utf-8')
                res.end(prerenderFailedShell(shell, sitePath, error))
              })
              .catch(() => next(error))
          })
      })
    },
  }
}
