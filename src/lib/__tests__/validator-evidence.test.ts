import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { validateInjectionOutput } from '../validator.js'

const projects: string[] = []
async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'inventory-injection-'))
  projects.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}
afterEach(async () => {
  await Promise.all(projects.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('injection validation uses generated artifacts rather than source vocabulary', () => {
  const files = {
    'src/server.ts': "import {start} from './start.js'; start()",
    'src/start.ts': 'export function start() {}',
    'src/App/router.ts':
      "import {Router} from 'express'; export const router = Router(); router.get('/stock', (req,res) => res.json(req.query))",
    'src/bonds/index.ts':
      "import {setupStock} from './stock.js'; export const setupBonds = () => [setupStock].forEach(setup => setup())",
    'src/bonds/stock.ts': 'export const setupStock = () => {}',
  }
  it('accepts server factories, normal Express objects and callback-based setup', async () => {
    expect(await validateInjectionOutput(await project(files))).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    })
  })
  it('accepts multiple Express middleware registrations for one path', async () => {
    const path = 'src/App/router.ts'
    const root = await project({
      ...files,
      [path]: files[path] + '\nrouter.get(`/stock`, authorize); router.get(`/stock`, listStock)',
    })
    expect((await validateInjectionOutput(root)).errors).toEqual([])
  })
  it('does not invent a required export for an application-owned resource helper', async () => {
    const root = await project({
      ...files,
      'src/App/Resource/Stock/index.ts': 'export const normalizeStock = value => value',
    })
    expect((await validateInjectionOutput(root)).errors).toEqual([])
  })
  it('still reports an actually missing generated scaffold artifact', async () => {
    const root = await project({ 'src/bonds/index.ts': 'export {}' })
    const result = await validateInjectionOutput(root)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing critical file: src/server.ts')
    expect(result.errors).toContain('Missing critical file: src/App/router.ts')
  })
})
