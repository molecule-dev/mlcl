import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { wireTemplateApiRouters } from '../scaffold.js'

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

const setupBase = async (): Promise<void> => {
  tmp = await mkdtemp(join(tmpdir(), 'wire-router-'))
  apiPath = join(tmp, 'api')
  routerPath = join(apiPath, 'src', 'App', 'router.ts')
  await mkdir(join(apiPath, 'src', 'App'), { recursive: true })
  await writeFile(routerPath, baseRouterContent)
}

const cleanup = async (): Promise<void> => {
  await rm(tmp, { recursive: true, force: true })
}

describe('wireTemplateApiRouters', () => {
  beforeEach(setupBase)
  afterEach(cleanup)

  it('does nothing when neither handlers/index.ts nor routes/ exist', async () => {
    await wireTemplateApiRouters(apiPath)
    const after = await readFile(routerPath, 'utf-8')
    expect(after).toBe(baseRouterContent)
  })

  it('mounts handlers/index.ts when present', async () => {
    await mkdir(join(apiPath, 'src', 'handlers'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'handlers', 'index.ts'), '// stub')

    await wireTemplateApiRouters(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toContain(`import templateHandlers from '../handlers/index.js'`)
    expect(after).toContain(`router.use(templateHandlers)`)
  })

  it('mounts each routes/*.ts module under its file basename', async () => {
    await mkdir(join(apiPath, 'src', 'routes'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'routes', 'billing.ts'), 'export default {}')
    await writeFile(join(apiPath, 'src', 'routes', 'webhooks.ts'), 'export default {}')

    await wireTemplateApiRouters(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toContain(`import billingRoutes from '../routes/billing.js'`)
    expect(after).toContain(`router.use('/billing', billingRoutes)`)
    expect(after).toContain(`import webhooksRoutes from '../routes/webhooks.js'`)
    expect(after).toContain(`router.use('/webhooks', webhooksRoutes)`)
  })

  it('mounts both handlers and routes when both exist', async () => {
    await mkdir(join(apiPath, 'src', 'handlers'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'handlers', 'index.ts'), '// stub')
    await mkdir(join(apiPath, 'src', 'routes'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'routes', 'billing.ts'), 'export default {}')

    await wireTemplateApiRouters(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toContain(`import templateHandlers from '../handlers/index.js'`)
    expect(after).toContain(`import billingRoutes from '../routes/billing.js'`)
    expect(after).toContain(`router.use(templateHandlers)`)
    expect(after).toContain(`router.use('/billing', billingRoutes)`)
  })

  it('camel-cases hyphenated route filenames in the import identifier', async () => {
    await mkdir(join(apiPath, 'src', 'routes'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'routes', 'admin-tools.ts'), 'export default {}')

    await wireTemplateApiRouters(apiPath)

    const after = await readFile(routerPath, 'utf-8')
    expect(after).toContain(`import adminToolsRoutes from '../routes/admin-tools.js'`)
    expect(after).toContain(`router.use('/admin-tools', adminToolsRoutes)`)
  })

  it('is idempotent — repeated runs do not duplicate imports or mounts', async () => {
    await mkdir(join(apiPath, 'src', 'handlers'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'handlers', 'index.ts'), '// stub')
    await mkdir(join(apiPath, 'src', 'routes'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'routes', 'billing.ts'), 'export default {}')

    await wireTemplateApiRouters(apiPath)
    const afterFirst = await readFile(routerPath, 'utf-8')

    await wireTemplateApiRouters(apiPath)
    const afterSecond = await readFile(routerPath, 'utf-8')

    expect(afterSecond).toBe(afterFirst)
    const importMatches = (afterSecond.match(/from '..\/handlers\/index.js'/g) ?? []).length
    expect(importMatches).toBe(1)
  })

  it('skips silently when App/router.ts does not exist', async () => {
    await rm(routerPath)
    await mkdir(join(apiPath, 'src', 'handlers'), { recursive: true })
    await writeFile(join(apiPath, 'src', 'handlers', 'index.ts'), '// stub')

    // Should not throw.
    await expect(wireTemplateApiRouters(apiPath)).resolves.toBeUndefined()
  })
})
