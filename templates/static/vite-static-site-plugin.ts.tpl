import type { Plugin, ViteDevServer } from 'vite'

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
 * Dev-server half of the static-site pipeline: serves `getStaticFiles()` from
 * src/entry-server.tsx on the paths they will have in `dist/`, under the
 * configured `base`. Nothing is cached — every request re-evaluates the entry
 * through Vite's SSR loader, so editing content shows up on reload.
 */
export function staticSitePlugin(): Plugin {
  return {
    name: 'molecule-static-site',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const base = server.config.base
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0] ?? '/'
        if (!url.startsWith(base)) return next()
        const sitePath = `/${url.slice(base.length)}`
        if (!SERVED.test(sitePath)) return next()
        server
          .ssrLoadModule('/src/entry-server.tsx')
          .then(async (mod) => {
            const entry = mod as { getStaticFiles: () => StaticFile[] | Promise<StaticFile[]> }
            const files = await entry.getStaticFiles()
            const hit = files.find((file) => file.path === sitePath)
            if (!hit) {
              next()
              return
            }
            res.setHeader('content-type', hit.contentType ?? contentTypeFor(hit.path))
            res.end(hit.content)
          })
          .catch((error: unknown) => next(error))
      })
    },
  }
}
