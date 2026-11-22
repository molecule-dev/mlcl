/**
 * The dev server prerenders every route, as the build does: the preview shows the markup the
 * build ships. A route that falls back to the client shell hides a broken render until
 * `npm run build`, so this starts Vite with the app's own config and requests `/`.
 */
import type { AddressInfo } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
let server: ViteDevServer | undefined
let origin = ''

beforeAll(async () => {
  server = await createServer({
    root: appRoot,
    configFile: resolve(appRoot, 'vite.config.ts'),
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1', open: false },
  })
  await server.listen()
  const { port } = server.httpServer!.address() as AddressInfo
  origin = `http://127.0.0.1:${port}`
}, 60_000)

afterAll(async () => {
  await server?.close()
})

describe('the dev server', () => {
  it('serves / prerendered, not the client shell', async () => {
    const response = await fetch(`${origin}/`, { headers: { accept: 'text/html' } })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).not.toContain('could not be prerendered')
    // The root carries the rendered page, not an empty mount point.
    expect(html).toMatch(/<div id="root"><[a-z]/)
  }, 60_000)
})
