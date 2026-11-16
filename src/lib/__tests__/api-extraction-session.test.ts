import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApiExtractionSession } from '../api-extraction-session.js'
import { extractPackageApi } from '../api-extractor.js'
import { generateDocs } from '../docs-sync.js'
import type { Registry } from '../schema.js'

vi.mock('../api-extraction-session.js', async (importOriginal) => {
  const actual = await importOriginal<{
    createApiExtractionSession: typeof createApiExtractionSession
  }>()
  return {
    ...actual,
    createApiExtractionSession: vi.fn((...args: Parameters<typeof createApiExtractionSession>) => {
      const session = actual.createApiExtractionSession(...args)
      return { getIndexFile: vi.fn(session.getIndexFile) }
    }),
  }
})

const roots: string[] = []
const shared = '@molecule/app-session-shared'
const first = '@molecule/app-session-first'
const second = '@molecule/app-session-second'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))
})

afterEach(async () => {
  vi.useRealTimers()
  vi.clearAllMocks()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function put(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

async function fixture(): Promise<{
  root: string
  registry: Registry
  dir: (name: string) => string
}> {
  const root = await mkdtemp(join(tmpdir(), 'api-extraction-session-'))
  roots.push(root)
  await put(join(root, '.prettierrc'), JSON.stringify({ singleQuote: false, semi: false }))
  const packages = Object.fromEntries(
    [shared, first, second].map((name) => [
      name,
      {
        path: `packages/${name.split('/')[1]}`,
        type: 'core',
        stack: 'app',
        category: 'session-fixture',
        label: name,
        description: 'Independent program fixture.',
      },
    ]),
  )
  const registry = { version: 1, packages } as Registry
  const dir = (name: string): string => join(root, registry.packages[name].path)
  for (const name of [shared, first, second]) {
    await put(
      join(dir(name), 'package.json'),
      JSON.stringify({
        name,
        version: '1.0.0',
        type: 'module',
        exports: { '.': { types: './dist/index.d.ts' } },
      }),
    )
    await put(
      join(dir(name), 'src/index.ts'),
      name === shared
        ? "export interface Person { base: string }\nexport const person: Person = { base: 'ok' }\n"
        : `export * from '${shared}'\nimport { person } from '${shared}'\nexport const snapshot = { ...person }\n`,
    )
  }
  return { root, registry, dir }
}

describe('independent package programs with shared compiler work', () => {
  it('evicts cold syntax without changing the extracted API when a generation exceeds the cache budget', async () => {
    const { root, registry, dir } = await fixture()
    const padding = `/*${'x'.repeat(2 * 1024 * 1024)}*/\n`
    await put(join(dir(first), 'src/index.ts'), padding + 'export const original = { value: 1 }\n')
    const sourcePackages = new Map(Object.keys(registry.packages).map((name) => [name, dir(name)]))
    const polluters = Array.from({ length: 9 }, (_, i) => join(root, `packages/polluter-${i}`))
    for (const [i, packageDir] of polluters.entries()) {
      await put(join(packageDir, 'src/index.ts'), padding + `export const value = ${i}\n`)
      sourcePackages.set(`@molecule/app-polluter-${i}`, packageDir)
    }
    const session = createApiExtractionSession(sourcePackages)
    const options = { rootDir: root, sourcePackages, session }
    const before = extractPackageApi(dir(first), options)
    const original = session.getIndexFile(dir(first))!.compilerNode
    // Nine distinct 2 MiB source files exceed the 32 MiB UTF-16 syntax budget.
    // Comments keep this a small AST fixture while exercising real parsing.
    for (const packageDir of polluters) {
      expect(extractPackageApi(packageDir, options).exports).toHaveLength(1)
    }
    expect(extractPackageApi(dir(first), options)).toEqual(before)
    expect(session.getIndexFile(dir(first))!.compilerNode === original).toBe(false)
  })

  it('reuses parsed transitive declarations through the real README generator', async () => {
    const { root, registry } = await fixture()
    const docs = await generateDocs(registry, root, [first, second])
    expect(docs).toHaveLength(2)
    expect(docs.every((doc) => doc.md.includes('base: string'))).toBe(true)
    expect(createApiExtractionSession).toHaveBeenCalledTimes(1)
    const session = vi.mocked(createApiExtractionSession).mock.results[0].value
    const files = vi.mocked(session.getIndexFile).mock.results.map((result) => result.value!)
    expect(files).toHaveLength(2)
    const declarations = files.map((file) => file.getExportedDeclarations().get('Person')![0])
    // Both checkers have bound this exact parsed declaration. Fresh Projects
    // per package would produce equal text but different compiler nodes.
    expect(declarations[0].compilerNode).toBe(declarations[1].compilerNode)
  })

  it.each([
    [first, second],
    [second, first],
  ])('keeps module augmentations local when scope is %s then %s', async (a, b) => {
    const { root, registry, dir } = await fixture()
    await put(
      join(dir(first), 'src/augmentation.ts'),
      `import '${shared}'\ndeclare module '${shared}' { interface Person { firstOnly: number } }\n`,
    )
    // Registry order is the generator's order, even for an explicit scope.
    registry.packages = Object.fromEntries(
      [a, b, shared].map((name) => [name, registry.packages[name]]),
    )
    const full = await generateDocs(registry, root, [a, b])
    const alone = await generateDocs(registry, root, [second])
    expect(full.find((doc) => doc.name === first)!.md).toContain('firstOnly: number')
    expect(full.find((doc) => doc.name === second)!.md).not.toContain('firstOnly')
    expect(full.find((doc) => doc.name === second)!.md).toBe(alone[0].md)
  })

  it("retains each package's unimported global roots without leaking them to other packages", async () => {
    const { root, registry, dir } = await fixture()
    for (const [name, property] of [
      [first, 'firstOnly'],
      [second, 'secondOnly'],
    ]) {
      await put(
        join(dir(name), 'src/globals.d.ts'),
        `interface Date { ${property}: '${property}' }\n`,
      )
      await put(
        join(dir(name), 'src/index.ts'),
        'export const own = new Date().' +
          property +
          '\nexport const foreign = new Date().' +
          (property === 'firstOnly' ? 'secondOnly' : 'firstOnly') +
          '\n',
      )
    }
    const full = await generateDocs(registry, root, [first, second])
    for (const [name, property] of [
      [first, 'firstOnly'],
      [second, 'secondOnly'],
    ]) {
      const md = full.find((doc) => doc.name === name)!.md
      expect(md).toContain(`const own: "${property}"`)
      expect(md).toContain('const foreign: any')
      expect(md).toBe((await generateDocs(registry, root, [name]))[0].md)
    }
  })

  it('observes transitive source changes on the next generation', async () => {
    const { root, registry, dir } = await fixture()
    const before = (await generateDocs(registry, root, [second]))[0].md
    await put(
      join(dir(shared), 'src/index.ts'),
      'export interface Person { updated: boolean }\nexport const person: Person = { updated: true }\n',
    )
    const after = (await generateDocs(registry, root, [second]))[0].md
    expect(before).toContain('base: string')
    expect(after).toContain('updated: boolean')
    expect(after).not.toContain('base: string')
  })

  it('observes sibling manifest changes on the next generation', async () => {
    const { root, registry, dir } = await fixture()
    await put(join(dir(second), 'src/index.ts'), `export * from '${shared}/selected'\n`)
    for (const version of ['old', 'new']) {
      await put(
        join(dir(shared), `src/${version}.tsx`),
        `/** ${version} selection. */\nexport interface Selection { ${version}: true }\n`,
      )
    }
    const generate = async (version: string): Promise<string> => {
      await put(
        join(dir(shared), 'package.json'),
        JSON.stringify({
          name: shared,
          type: 'module',
          exports: { './selected': { types: `./dist/${version}.d.ts` } },
        }),
      )
      return (await generateDocs(registry, root, [second]))[0].md
    }
    expect(await generate('old')).toContain('old selection.')
    const updated = await generate('new')
    expect(updated).toContain('new selection.')
    expect(updated).not.toContain('old selection.')
  })

  it('resolves import and require declarations separately in the same source file', async () => {
    const { root, registry, dir } = await fixture()
    await put(
      join(dir(second), 'src/index.ts'),
      `export type { Flavor as Imported } from 'session-conditional' with { "resolution-mode": "import" }\n` +
        `export type { Flavor as Required } from 'session-conditional' with { "resolution-mode": "require" }\n`,
    )
    const dependency = join(root, 'node_modules/session-conditional')
    await put(
      join(dependency, 'package.json'),
      JSON.stringify({
        name: 'session-conditional',
        exports: { import: { types: './esm.d.ts' }, require: { types: './cjs.d.cts' } },
      }),
    )
    await put(join(dependency, 'esm.d.ts'), 'export interface Flavor { importOnly: true }\n')
    await put(join(dependency, 'cjs.d.cts'), 'export interface Flavor { requireOnly: true }\n')
    const md = (await generateDocs(registry, root, [second]))[0].md
    expect(md).toContain('importOnly: true')
    expect(md).toContain('requireOnly: true')
  })
})
