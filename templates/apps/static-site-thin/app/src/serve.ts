/**
 * A static file server that behaves like a static host: `/about/` serves
 * `about/index.html`, `/about` redirects to `/about/`, an unknown path gets
 * `404.html` with status 404, and nothing outside the base path is served —
 * except `/` itself, which redirects to the base path.
 * Used by `npm run preview` (the built `dist/`) and `npm run dev`.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import {
  createServer,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type Server,
  type ServerResponse,
} from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

/** Content type by file extension. */
export const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
}

/** What a request path resolves to. */
export type Resolved = { file: string } | { redirect: string } | null

/**
 * Resolve a request path to a file under `dir`, the way a static host does.
 *
 * @param dir - The site root on disk.
 * @param basePath - `/` or `/blog/`.
 * @param urlPath - The request's decoded path.
 * @returns The file, a redirect, or null when nothing matches.
 */
export function resolveRequest(dir: string, basePath: string, urlPath: string): Resolved {
  // The site root of a site served under a base path is where a browser (and
  // the IDE preview) opens first: send it to the site instead of a 404.
  if (urlPath === '/' && basePath !== '/') return { redirect: basePath }
  if (urlPath + '/' === basePath) return { redirect: basePath }
  if (!urlPath.startsWith(basePath)) return null
  const file = normalize(join(dir, urlPath.slice(basePath.length)))
  if (file !== dir && !file.startsWith(dir + sep)) return null
  if (existsSync(file) && statSync(file).isFile()) return { file }
  if (existsSync(join(file, 'index.html'))) {
    return urlPath.endsWith('/') ? { file: join(file, 'index.html') } : { redirect: urlPath + '/' }
  }
  return null
}

/** How to serve a directory. */
export interface ServeOptions {
  /** The directory to serve — read per request, so a rebuild can swap it. */
  dir: () => string
  basePath: string
  port: number
  host?: string
  /** Rewrites every HTML response (the dev server's reload script). */
  transformHtml?: (html: string) => string
  /** Handles a request first; return true when it did. */
  intercept?: (req: IncomingMessage, res: ServerResponse) => boolean
}

/**
 * Serve a directory over HTTP.
 *
 * @param options - What and where to serve.
 * @returns The listening server.
 */
export function serveDirectory(options: ServeOptions): Promise<Server> {
  const { dir, basePath, port, host = '0.0.0.0', transformHtml, intercept } = options
  const server = createServer((req, res) => {
    if (intercept?.(req, res)) return
    let urlPath: string
    try {
      urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch (_error) {
      // A malformed percent-escape: answer it, never crash the server.
      res.writeHead(400).end('Bad request')
      return
    }
    const root = dir()
    const hit = resolveRequest(root, basePath, urlPath)
    if (hit && 'redirect' in hit) {
      res.writeHead(301, { location: hit.redirect }).end()
      return
    }
    const file = hit?.file ?? join(root, '404.html')
    const status = hit ? 200 : 404
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found')
      return
    }
    const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
    const headers: OutgoingHttpHeaders = { 'content-type': type, 'cache-control': 'no-cache' }
    if (transformHtml && type.startsWith('text/html')) {
      res.writeHead(status, headers).end(transformHtml(readFileSync(file, 'utf8')))
      return
    }
    res.writeHead(status, headers)
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
  })
  return new Promise((resolveServer, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolveServer(server))
  })
}

/**
 * The port to serve on: PORT, then VITE_PORT (what the e2e specs read), then
 * 5173 inside a molecule sandbox (the port its preview shows), else 3000.
 *
 * @returns The port.
 */
export function defaultPort(): number {
  const fromEnv = Number(process.env.PORT || process.env.VITE_PORT)
  if (fromEnv) return fromEnv
  return existsSync('/etc/mol/app-root') ? 5173 : 3000
}
