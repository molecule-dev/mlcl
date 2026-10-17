/**
 * The scaffold's `vite.config` gives `vite preview` the SAME API proxy as the dev server
 * (../scaffold.ts `loadTemplate('app/shared/vite.config.ts.tpl')`).
 *
 * X1 xr-molecule-flash-m126 (+27:13 → +28:45): the platform's local production walk builds the app
 * and serves `dist/` with `vite preview`, and the built app's relative `/api` calls — the
 * scaffold's own `API_BASE_URL` default is `/api` — came back as Vite's SPA fallback: `index.html`
 * with a 200. The preview block carried only the origin-isolation header, so every API call from
 * the production build got HTML instead of JSON. `server.proxy` and `preview.proxy` are one const
 * so the two servers cannot drift.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TEMPLATE = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'templates',
  'app',
  'shared',
  'vite.config.ts.tpl',
)
const tpl = readFileSync(TEMPLATE, 'utf8')

/** The shared proxy table the template declares (`const apiProxy = { … }`). */
const apiProxyBlock = /const apiProxy = \{([\s\S]*?)\n\}/.exec(tpl)?.[1] ?? ''

/** The `preview: { … }` block, up to its closing brace. */
const previewBlock = /preview:\s*\{([\s\S]*?)\n {2}\},/.exec(tpl)?.[1] ?? ''

describe('app/shared/vite.config.ts.tpl', () => {
  it('declares one proxy table for `/api`, `/health` and the socket.io upgrade', () => {
    expect(apiProxyBlock).toContain("'/api'")
    expect(apiProxyBlock).toContain("'/health'")
    expect(apiProxyBlock).toMatch(/'\/socket\.io':\s*\{[\s\S]*?ws: true/)
  })

  it('gives `vite preview` the same proxy as the dev server', () => {
    // Both servers name the one table; a second inline table would drift.
    expect(tpl.match(/proxy: apiProxy,/g)).toHaveLength(2)
    expect(previewBlock).toContain('proxy: apiProxy')
    expect(previewBlock).toContain('Origin-Agent-Cluster')
  })

  it('keeps the target precedence the dev server documents', () => {
    const apiTarget = /const apiTarget =([\s\S]*?)\nconst apiProxy/.exec(tpl)?.[1] ?? ''
    expect(apiTarget).toContain('VITE_API_URL')
    expect(apiTarget).toContain('process.env.PORT || 4000')
    expect(apiProxyBlock).toContain('target: apiTarget')
  })
})
