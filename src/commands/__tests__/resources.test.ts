/**
 * The `mlcl resources` command writes clients for packages or a contract.
 * The generator has its own tests (`lib/__tests__/contract-resource-modules.test.ts`); this runs
 * the command any harness calls.
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Config } from '@oclif/core'
import { ESLint } from 'eslint'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copySharedEslintRules } from '../../lib/__tests__/shared-eslint-rules.js'
import Resources from '../resources.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const require = createRequire(import.meta.url)
const NODE_MODULES = dirname(dirname(require.resolve('eslint/package.json')))
const RESOURCE_RULE = 'molecule-resources/prefer-generated-client'
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
          '@molecule/app-query-react': '1.8.0',
          '@molecule/app-react': '3.3.0',
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

  function lintFor(workspace: string, configName = 'eslint.config.mjs'): ESLint {
    const app = join(dir, workspace)
    return new ESLint({
      cwd: app,
      overrideConfigFile: join(app, configName),
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: app } } },
    })
  }

  async function scaffoldLint(
    workspace = 'app',
    configName = 'eslint.config.mjs',
  ): Promise<ESLint> {
    const app = join(dir, workspace)
    const config = join(app, configName)
    copyFileSync(join(MLCL_ROOT, 'templates/shared/eslint.config.js.tpl'), config)
    await copySharedEslintRules(app)
    symlinkSync(NODE_MODULES, join(app, 'node_modules'), 'dir')
    return lintFor(workspace, configName)
  }

  function writeStarContract(): void {
    const item = {
      type: 'object',
      required: ['id', 'starred'],
      properties: { id: { type: 'string' }, starred: { type: 'boolean' } },
    }
    const response = {
      responses: { '200': { content: { 'application/json': { schema: item } } } },
    }
    const paths = {
      '/repositories/{id}': { get: response },
      '/repositories/{id}/star': { put: response, delete: response },
      '/articles/{slug}': { get: response },
      '/repositories/search': {
        get: { responses: { '204': { description: 'A route without a generated client' } } },
      },
    }
    writeFileSync(join(dir, 'specs/openapi.json'), JSON.stringify({ openapi: '3.1.0', paths }))
  }

  it('enforces the generated client for a separate contract app at the literal, even through a transport wrapper', async () => {
    const lint = await scaffoldLint()
    writeStarContract()
    await run('--contract', 'specs/openapi.json')

    const filename = join(dir, 'app/src/api.ts')
    const [bad] = await lint.lintText(
      [
        'export const save = (send: (path: string) => void, id: string): void => {',
        '  const endpoint = `/api/repositories/${encodeURIComponent(id)}/star?source=button`',
        '  send(endpoint)',
        '}',
      ].join('\n'),
      { filePath: filename },
    )
    expect(bad.messages).toMatchObject([{ line: 2, severity: 2, ruleId: RESOURCE_RULE }])
    expect(bad.messages[0]?.message).toContain('src/resources/repositories.ts')
    expect(bad.messages[0]?.message).toContain('`useRepositoryStar` (PUT/DELETE)')

    const [good] = await lint.lintText(
      [
        "import { type Repository, useRepositoryStar } from './resources/repositories.js'",
        '',
        'export function useStar(record: Repository): ReturnType<typeof useRepositoryStar> {',
        '  return useRepositoryStar(record)',
        '}',
      ].join('\n'),
      { filePath: filename },
    )
    expect(good.messages).toEqual([])
  })

  it('keeps a colliding page route navigable while refusing the same URL in a request', async () => {
    const lint = await scaffoldLint()
    writeStarContract()
    await run('--contract', 'specs/openapi.json')

    const [result] = await lint.lintText(
      [
        "import * as routing from '@molecule/app-routing'",
        "import { useMoleculeNavigate as useGo } from '@molecule/app-routing-react-router'",
        '',
        'export function useArticlePage(id: string): object {',
        '  const navigate = useGo()',
        '  const open = (): void => navigate(`/articles/${id}`)',
        '  const router = routing.getRouter()',
        '  router.navigate(`/articles/${id}`)',
        '  routing.navigate(`/articles/${id}`)',
        '  const { navigate: move } = router',
        '  move(`/articles/${id}`)',
        '  return { open, anchor: <a href="/articles/example">Article</a>,',
        '    link: <PageLink to={`/articles/${id}`} />,',
        '    request: fetch(`/articles/${id}`), search: fetch("/repositories/search") }',
        '}',
      ].join('\n'),
      { filePath: join(dir, 'app/src/navigation.tsx') },
    )
    expect(result.fatalErrorCount).toBe(0)
    const findings = result.messages.filter(({ ruleId }) => ruleId === RESOURCE_RULE)
    expect(findings).toMatchObject([{ line: 14, severity: 2 }])
    expect(findings[0]?.message).toContain('useArticle')
  })

  it('makes deletion of a generated file fail lint until regeneration and accepts contract removal', async () => {
    await scaffoldLint()
    writeStarContract()
    await run('--contract', 'specs/openapi.json')
    writeFileSync(join(dir, 'app/src/control.ts'), "export const status = 'ready'\n")
    const check = (): ReturnType<typeof spawnSync<string>> =>
      spawnSync(process.execPath, [join(NODE_MODULES, 'eslint/bin/eslint.js'), 'src/'], {
        cwd: join(dir, 'app'),
        encoding: 'utf8',
      })
    const initial = check()
    expect(initial.status, initial.stderr + initial.stdout).toBe(0)
    rmSync(join(dir, 'app/src/resources'), { recursive: true })
    const deleted = check()
    expect(deleted.status).not.toBe(0)
    expect(deleted.stderr).toMatch(/articles\.ts.*mlcl resources --contract specs\/openapi\.json/)
    await run('--contract', 'specs/openapi.json')
    expect(check().status).toBe(0)
    writeFileSync(join(dir, 'specs/openapi.json'), '{"openapi":"3.1.0","paths":{}}')
    await run('--contract', 'specs/openapi.json')
    expect(existsSync(join(dir, 'app/src/resources/repositories.ts'))).toBe(false)
    expect(check().status).toBe(0)
  })

  it('stays silent with no generated modules, then enforces each generated package independently', async () => {
    const lint = await scaffoldLint()
    const app = join(dir, 'app')
    const filename = join(app, 'src/api.ts')
    const code = "export const endpoints = ['/projects', '/articles/example']\n"
    const findings = async (engine: ESLint): Promise<string[]> => {
      const [report] = await engine.lintText(code, { filePath: filename })
      return report.messages
        .filter(({ ruleId }) => ruleId === RESOURCE_RULE)
        .map(({ message }) => message)
    }
    expect(await findings(lint)).toEqual([])
    const project = '@molecule/api-resource-project'
    const article = '@molecule/api-resource-article'
    writeFileSync(
      join(dir, 'api/package.json'),
      JSON.stringify({ dependencies: { [project]: '1.0.0', [article]: '1.0.0' } }),
    )
    await run('--package', project)
    expect(await findings(lintFor('app'))).toEqual([expect.stringContaining('useProjects')])
    await run('--package', article)
    expect(await findings(lintFor('app'))).toEqual([
      expect.stringContaining('useProjects'),
      expect.stringContaining('useArticle'),
    ])
  })

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
