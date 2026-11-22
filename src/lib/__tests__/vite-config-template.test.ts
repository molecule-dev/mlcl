/**
 * The custom scaffold's `vite.config` (../scaffold.ts `loadTemplate('app/shared/vite.config.ts.tpl')`)
 * takes its whole config from `createFrameworkViteConfig`
 * (`@molecule/app-vite-config-default/framework`), the factory the flagship apps reach through
 * `createDefaultViteConfig`. So the custom and flagship apps cannot drift: `vite preview` and the
 * dev server forward the same API routes (X1 xr-molecule-flash-m126 walked the production build
 * with `vite preview` and needed the API on every route the dev server forwards), the PWA
 * precaches the same shell, and every `@molecule` package has one module identity. Those
 * behaviours are tested in that package; this pins the delegation and that the template keeps no
 * second copy of any of them.
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

describe('app/shared/vite.config.ts.tpl', () => {
  it('takes its config from createFrameworkViteConfig with the framework plugins', () => {
    expect(tpl).toContain(
      "import { createFrameworkViteConfig } from '@molecule/app-vite-config-default/framework'",
    )
    expect(tpl).toContain('const config = createFrameworkViteConfig(branding, {\n{{VITE_PLUGINS}}')
  })

  it.each(['proxy:', 'globPatterns', 'dedupe:', 'alias:', 'optimizeDeps', 'VitePWA', 'server:'])(
    'declares no %s of its own',
    (setting) => {
      expect(tpl).not.toContain(setting)
    },
  )
})
