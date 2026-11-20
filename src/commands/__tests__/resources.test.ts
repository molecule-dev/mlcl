/**
 * The `mlcl resources` command writes clients for packages or a contract.
 * The generator has its own tests (`lib/__tests__/contract-resource-modules.test.ts`); this runs
 * the command any harness calls.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Resources from '../resources.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const INVENTORY = readFileSync(
  join(MLCL_ROOT, 'src/lib/__tests__/fixtures/inventory-openapi.json.txt'),
  'utf8',
)

describe('mlcl resources', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-resources-'))
    for (const sub of ['app/src', 'api', 'specs']) mkdirSync(join(dir, sub), { recursive: true })
    writeFileSync(
      join(dir, 'app/package.json'),
      JSON.stringify({
        dependencies: {
          '@molecule/app-http': '1.7.0',
          '@molecule/app-query': '1.0.0',
          '@molecule/app-query-react': '1.4.0',
        },
      }),
    )
    writeFileSync(join(dir, 'api/package.json'), JSON.stringify({ dependencies: {} }))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /** Run the command against the temp project and return what it printed. */
  async function run(...args: string[]): Promise<string[]> {
    const command = new Resources([...args, '--project', dir], await Config.load(MLCL_ROOT))
    const lines: string[] = []
    vi.spyOn(command, 'log').mockImplementation((line?: string) => void lines.push(String(line)))
    await command.run()
    return lines
  }

  it('writes one module per collection of the contract and reports each', async () => {
    writeFileSync(join(dir, 'specs/openapi.json'), INVENTORY)
    const report = JSON.parse((await run('--contract', 'specs/openapi.json', '--json')).join('\n'))
    expect(report.written.map((module: { path: string }) => module.path)).toEqual([
      'app/src/resources/items.ts',
      'app/src/resources/stock-counts.ts',
    ])
    expect(report.skipped).toEqual([expect.objectContaining({ path: '/health' })])
    // The command formats what it writes, so the type arguments may wrap across lines.
    expect(readFileSync(join(dir, 'app/src/resources/items.ts'), 'utf8')).toMatch(
      /createQueryResource<\s*Item,\s*ItemCreate,\s*ItemUpdate,?\s*>\(\{/,
    )
  })

  it('reports callable exports so a page can import the generated client', async () => {
    writeFileSync(join(dir, 'specs/openapi.json'), INVENTORY)
    const report = JSON.parse((await run('--contract', 'specs/openapi.json', '--json')).join('\n'))
    const [items] = report.written
    const source = readFileSync(join(dir, items.path), 'utf8')
    expect(items).toMatchObject({
      resource: 'items',
      export: 'useItems',
      calls: expect.arrayContaining(['useItems', 'createItem', 'itemErrorMessage']),
    })
    for (const name of items.calls) {
      expect(source).toMatch(new RegExp(`export (?:async )?function ${name}\\(`))
    }
  })

  it('names a contract beside the project by its path from the project', async () => {
    const beside = join(dir, '..', `${dir.split('/').pop()}-fixtures`)
    mkdirSync(beside, { recursive: true })
    try {
      writeFileSync(join(beside, 'openapi.json'), INVENTORY)
      const contract = `../${beside.split('/').pop()}/openapi.json`
      await run('--contract', join(beside, 'openapi.json'), '--json')
      const source = readFileSync(join(dir, 'app/src/resources/items.ts'), 'utf8')
      expect(source).toContain(`as ${contract} declares them`)
      expect(source).not.toContain(tmpdir())
    } finally {
      await rm(beside, { recursive: true, force: true })
    }
  })

  it('fails, and writes nothing, when the project has no such contract', async () => {
    await expect(run('--contract', 'specs/missing.yml')).rejects.toThrow()
    expect(existsSync(join(dir, 'app/src/resources'))).toBe(false)
  })

  it('generates only the requested declared package and preserves the client on reruns', async () => {
    const project = '@molecule/api-resource-project'
    const article = '@molecule/api-resource-article'
    writeFileSync(
      join(dir, 'api/package.json'),
      JSON.stringify({ dependencies: { [project]: '1.0.0', [article]: '1.0.0' } }),
    )
    const args = ['--package', project, '--json']
    const report = JSON.parse((await run(...args)).join('\n'))
    expect(report.written).toEqual([
      expect.objectContaining({ path: 'app/src/resources/projects.ts', export: 'useProjects' }),
    ])
    expect(existsSync(join(dir, 'app/src/resources/articles.ts'))).toBe(false)

    const path = join(dir, report.written[0].path)
    writeFileSync(path, 'export const edited = true\n')
    const again = JSON.parse((await run(...args)).join('\n'))
    expect(again.written).toEqual([])
    expect(again.kept).toEqual(['app/src/resources/projects.ts'])
    expect(readFileSync(path, 'utf8')).toBe('export const edited = true\n')
  })

  it('refuses an undeclared resource package without writing a client', async () => {
    await expect(run('--package', '@molecule/api-resource-project')).rejects.toThrow()
    expect(existsSync(join(dir, 'app/src/resources'))).toBe(false)
  })
})
