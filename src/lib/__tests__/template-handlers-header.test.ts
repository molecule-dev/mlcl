/**
 * Every flagship template's handler aggregator carries the two mount rules its header
 * states: a router's own paths are relative to its `router.use('/x', router)` line, and the
 * whole file is served under the API's `/api` mount — so a route the client or a suite calls
 * at `/api/users` is declared as `/users`.
 *
 * The second sentence was added after xr-molecule-flash-m197: the plan and the handlers were
 * written with an invented `/rw/` prefix, and the in-place rename that followed broke 15
 * route lines and stopped the API. A template is where the executor reads this, and a
 * template added without it teaches the mistake again.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')

/** Every template's `api/src/handlers/index.ts`, absolute. */
const handlerIndexes = readdirSync(TEMPLATES)
  .map((name) => join(TEMPLATES, name, 'api', 'src', 'handlers', 'index.ts'))
  .filter((path) => existsSync(path))

describe('the template handler aggregator header', () => {
  it('states that the file is served under /api and a route is declared without it', () => {
    expect(handlerIndexes.length).toBeGreaterThan(100)
    for (const path of handlerIndexes) {
      const text = readFileSync(path, 'utf8')
      expect(text, path).toContain('Everything here is served under `/api`')
      expect(text, path).toContain('is declared as `/users`. Do not add a prefix of your own.')
      expect(text, path).toContain('RELATIVE to that mount')
    }
  })
})
