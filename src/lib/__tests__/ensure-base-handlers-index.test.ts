import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ensureBaseHandlersIndex } from '../scaffold.js'

const baseRouterContent = `import { Router } from 'express'

import { requestHandlerMap as User } from './Resource/User/index.js'

export const router = Router()

router.post(\`/users\`,
  User.create
)
`

let tmp: string
let apiPath: string
let routerPath: string
let handlersIndexPath: string

const setupBase = async (): Promise<void> => {
  tmp = await mkdtemp(join(tmpdir(), 'base-handlers-'))
  apiPath = join(tmp, 'api')
  routerPath = join(apiPath, 'src', 'App', 'router.ts')
  handlersIndexPath = join(apiPath, 'src', 'handlers', 'index.ts')
  await mkdir(join(apiPath, 'src', 'App'), { recursive: true })
  await writeFile(routerPath, baseRouterContent)
}

const cleanup = async (): Promise<void> => {
  await rm(tmp, { recursive: true, force: true })
}

describe('ensureBaseHandlersIndex', () => {
  beforeEach(setupBase)
  afterEach(cleanup)

  it('creates a default-exported handlers/index.ts when none exists', async () => {
    expect(existsSync(handlersIndexPath)).toBe(false)

    await ensureBaseHandlersIndex(apiPath)

    expect(existsSync(handlersIndexPath)).toBe(true)
    const handlers = await readFile(handlersIndexPath, 'utf-8')
    expect(handlers).toContain(`import { Router } from 'express'`)
    expect(handlers).toContain(`export default router`)
  })

  it('states in its header that a router’s routes are relative to its mount', async () => {
    // The generated aggregator is the file the executor edits to register a feature router,
    // and the one mistake it must not make is repeating the mount prefix in the routes
    // (flash-m108 declared `router.post('/users', …)` in a router mounted at `/users`, then
    // rewrote the app's router three times looking for the missing `/api/users` route).
    await ensureBaseHandlersIndex(apiPath)

    const handlers = await readFile(handlersIndexPath, 'utf-8')
    expect(handlers).toContain('RELATIVE to that mount')
    expect(handlers).toContain('answers at `/users/users`')
    expect(handlers).toContain('change its mount line here')
    // …and that the API's own mount is `/api`, so the route declared here is `/users`, not
    // `/api/users` or a prefix of the executor's own (xr-molecule-flash-m197 planned every
    // route under an invented `/rw/` and the later rename broke 15 route lines).
    expect(handlers).toContain('Everything here is served under `/api`')
    expect(handlers).toContain('is declared as `/users`. Do not add a prefix of your own.')
  })

  it('imports and mounts the handlers router in App/router.ts', async () => {
    await ensureBaseHandlersIndex(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toContain(`import handlers from '../handlers/index.js'`)
    expect(after).toContain(`router.use(handlers)`)
    // The import lands in the import block (before the first router statement),
    // the mount after it.
    expect(after.indexOf(`import handlers`)).toBeLessThan(after.indexOf(`router.use(handlers)`))
  })

  it('mounts the app handlers BEFORE the built-in routes, so an app route wins a conflict', async () => {
    await ensureBaseHandlersIndex(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    // Express answers with the first match: mounted after `POST /users`, an app's
    // own signup at that path never ran.
    expect(after.indexOf(`router.use(handlers)`)).toBeLessThan(
      after.indexOf(`router.post(\`/users\``),
    )
    expect(after).toContain('takes precedence over a built-in route below')
  })

  it('appends the mount when the router has no routes yet', async () => {
    await writeFile(
      routerPath,
      `import { Router } from 'express'\n\nexport const router = Router()\n`,
    )
    await ensureBaseHandlersIndex(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after.trimEnd().endsWith('router.use(handlers)')).toBe(true)
  })

  it('does not overwrite an existing handlers/index.ts', async () => {
    await mkdir(join(apiPath, 'src', 'handlers'), { recursive: true })
    await writeFile(handlersIndexPath, '// template-supplied handlers\nexport default {}\n')

    await ensureBaseHandlersIndex(apiPath)

    const handlers = await readFile(handlersIndexPath, 'utf-8')
    expect(handlers).toContain('// template-supplied handlers')
  })

  it('does not re-wire when the handlers import is already present', async () => {
    // Simulate a template build already wired by wireTemplateApiRouters.
    const prewired = `import { Router } from 'express'
import templateHandlers from '../handlers/index.js'

export const router = Router()

router.use(templateHandlers)
`
    await writeFile(routerPath, prewired)

    await ensureBaseHandlersIndex(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toBe(prewired)
    expect(after).not.toContain(`import handlers from`)
  })

  it('is idempotent — repeated runs do not duplicate the import or mount', async () => {
    await ensureBaseHandlersIndex(apiPath)
    const afterFirst = await readFile(routerPath, 'utf-8')

    await ensureBaseHandlersIndex(apiPath)
    const afterSecond = await readFile(routerPath, 'utf-8')

    expect(afterSecond).toBe(afterFirst)
    const importMatches = (afterSecond.match(/from '..\/handlers\/index.js'/g) ?? []).length
    expect(importMatches).toBe(1)
    const mountMatches = (afterSecond.match(/router\.use\(handlers\)/g) ?? []).length
    expect(mountMatches).toBe(1)
  })

  it('skips silently when App/router.ts does not exist', async () => {
    await rm(routerPath)

    await expect(ensureBaseHandlersIndex(apiPath)).resolves.toBeUndefined()
    // No handlers file created when there is no router to wire it into.
    expect(existsSync(handlersIndexPath)).toBe(false)
  })
})
