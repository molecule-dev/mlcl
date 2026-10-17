/**
 * The scaffold's `vite.config` gives `vite preview` the SAME API proxy as the dev server
 * (../scaffold.ts `loadTemplate('app/shared/vite.config.ts.tpl')`).
 *
 * X1 xr-molecule-flash-m126 (+27:13 → +28:45) walked the production build with `vite preview` and
 * the platform needs that preview to reach the API on every route the dev server forwards. Vite 8
 * already falls back to `server.proxy` when `preview.proxy` is absent, but that is a version
 * default the config does not state; `@molecule/app-vite-config-default` names the table on both
 * servers for the flagship apps, and the custom scaffold template must say the same. `server.proxy`
 * and `preview.proxy` are one const so the two servers cannot drift.
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
