/**
 * `npm run dev` — builds the site, serves it, and rebuilds on every change.
 *
 * It runs the SAME build as `npm run build` (scripts/build.ts), into
 * `.site-dev/` instead of `dist/`, so the preview shows exactly what the build
 * writes — there is no second rendering path to drift from the real one. A
 * change under `content/`, `src/` or `public/` rebuilds (in a fresh process,
 * so edited modules are read again) and reloads every open page. A failed
 * build keeps serving the last good site and shows the error at the top of
 * the page until a build succeeds.
 *
 * Port: PORT, then VITE_PORT, then 5173 inside a molecule sandbox, else 3000.
 * BASE_PATH and SITE_URL apply as they do to the build.
 */
import { spawn } from 'node:child_process'
import { existsSync, watch } from 'node:fs'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defaultPort, serveDirectory } from '../src/serve.js'
import { createSite } from '../src/site.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = '.site-dev'
const outDir = join(root, OUT)
const site = createSite()
const port = defaultPort()
const EVENTS = site.withBase('/__site/events')

const clients = new Set<ServerResponse>()
/** The last build's error, shown on every page until a build succeeds. */
let lastError = ''
let building = false
let again = false
let waiting: Array<() => void> = []

/**
 * Run one build in a child process; reload the open pages when it ends.
 *
 * @returns Settles when this build (or the one queued behind it) ends.
 */
function build(): Promise<void> {
  const done = new Promise<void>((resolveBuild) => waiting.push(resolveBuild))
  if (building) {
    again = true
    return done
  }
  building = true
  const started = Date.now()
  let output = ''
  const child = spawn(process.execPath, ['--import', 'tsx', join(root, 'scripts/build.ts'), OUT], {
    cwd: root,
    env: process.env,
  })
  child.stdout.on('data', (d: Buffer) => (output += d.toString()))
  child.stderr.on('data', (d: Buffer) => (output += d.toString()))
  child.on('exit', (code) => {
    building = false
    if (code === 0) {
      lastError = ''
      console.log(`[dev] rebuilt in ${Date.now() - started} ms`)
    } else {
      lastError = output.trim() || `the build exited with code ${code}`
      console.error(`[dev] ${lastError}`)
    }
    for (const res of clients) res.write('data: reload\n\n')
    if (again) {
      again = false
      void build()
      return
    }
    const settle = waiting
    waiting = []
    for (const resolveBuild of settle) resolveBuild()
  })
  return done
}

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Add the reload script — and the build error, when there is one — to an HTML
 * page the dev server sends. Neither is ever part of the built site.
 *
 * @param html - The page as the build wrote it.
 * @returns The page with the dev additions.
 */
function transformHtml(html: string): string {
  const banner = lastError
    ? `<pre id="site-build-error" style="position:sticky;top:0;z-index:9999;margin:0;padding:12px 16px;background:#7f1d1d;color:#fff;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap">${escape(lastError)}</pre>`
    : ''
  const script = `<script>new EventSource(${JSON.stringify(EVENTS)}).onmessage=()=>location.reload()</script>`
  return html.replace(/<body([^>]*)>/, `<body$1>${banner}`).replace('</body>', `${script}</body>`)
}

/**
 * The e2e bridge: lets `@molecule/app-e2e-preview` drive the page the IDE's
 * preview is showing (the Tests panel runs the specs that way). It is the same
 * hub, client and runtime the Vite plugin in other molecule apps installs —
 * here attached to this server. Skipped when the e2e packages are not
 * installed or `MOL_E2E_PREVIEW_PLUGIN=0`; the site itself never needs it.
 */
interface E2EBridge {
  attach: (server: Server) => void
  inject: (html: string) => string
  serve: (req: IncomingMessage, res: ServerResponse) => boolean
}

async function loadE2EBridge(): Promise<E2EBridge | null> {
  if (process.env.MOL_E2E_PREVIEW_PLUGIN === '0') return null
  try {
    const preview = await import('@molecule/app-e2e-preview')
    const runtime = await import('@molecule/app-e2e-fixtures-default/runtime')
    // The bytes — the locator runtime and the header that says what it is — come from the
    // package, so this server and the Vite plugin serve the same script; a copy of the
    // package older than that export still gets the bare runtime.
    const runtimeScript =
      preview.E2E_PREVIEW_RUNTIME_SCRIPT ?? `;(${String(runtime.installE2ERuntime)})();`
    return {
      attach: (server) => void preview.attachE2EHub(server),
      inject: (html) => preview.injectE2EClientTag(html, site.basePath),
      serve(req, res) {
        const path = (req.url ?? '').split('?')[0] ?? ''
        if (path.endsWith(preview.E2E_RUNTIME_PATH)) {
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
          res.end(runtimeScript)
          return true
        }
        if (path.endsWith(preview.E2E_CLIENT_PATH)) {
          res.writeHead(200, {
            'content-type': 'text/javascript; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(preview.E2E_PREVIEW_CLIENT_SCRIPT)
          return true
        }
        return false
      },
    }
  } catch (_error) {
    // The e2e devDependencies are not installed: serve the site without the bridge.
    return null
  }
}

const e2e = await loadE2EBridge()

// The first build finishes before the port opens, so the first request never
// meets an empty directory.
await build()
const server = await serveDirectory({
  dir: () => outDir,
  basePath: site.basePath,
  port,
  transformHtml: (html) => (e2e ? e2e.inject(transformHtml(html)) : transformHtml(html)),
  intercept(req, res) {
    if (e2e?.serve(req, res)) return true
    if (!req.url?.startsWith(EVENTS)) return false
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    res.write(': connected\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return true
  },
})
e2e?.attach(server)
console.log(`[dev] serving http://localhost:${port}${site.basePath} (rebuilds on change)`)

let timer: ReturnType<typeof setTimeout> | undefined
const schedule = (): void => {
  clearTimeout(timer)
  timer = setTimeout(() => void build(), 80)
}
for (const target of ['content', 'src', 'public']) {
  const path = join(root, target)
  if (existsSync(path)) watch(path, { recursive: true }, schedule)
}
// Keep-alive comments, so a proxy between the preview and this server never
// closes an idle event stream.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n')
}, 15_000).unref()
