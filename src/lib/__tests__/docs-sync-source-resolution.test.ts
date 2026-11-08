import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkDocsSerial } from '../docs-check.js'
import { discoverReexporters, generateDocs } from '../docs-sync.js'
import type { Registry } from '../schema.js'

const roots: string[] = []
const sibling = '@molecule/app-doc-source'
const consumer = '@molecule/app-doc-consumer'
const facade = '@molecule/app-doc-facade'
const siblingPath = 'packages/app/core/doc-source'
const consumerPath = 'packages/app/frameworks/doc-consumer'
const facadePath = 'packages/app/frameworks/doc-facade'

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function put(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

async function fixture(reexport = `export * from '${sibling}'`): Promise<{
  tree: string
  live: string
  registry: Registry
}> {
  const root = await mkdtemp(join(tmpdir(), 'docs-source-resolution-'))
  roots.push(root)
  const tree = join(root, 'export')
  const live = join(root, 'live')
  const packages = {
    [sibling]: { path: siblingPath, type: 'core', stack: 'app', category: 'docs' },
    [consumer]: { path: consumerPath, type: 'framework', stack: 'app', category: 'framework' },
    [facade]: { path: facadePath, type: 'framework', stack: 'app', category: 'framework' },
  }
  for (const [name, entry] of Object.entries(packages)) {
    for (const base of [tree, live]) {
      await put(
        join(base, entry.path, 'package.json'),
        JSON.stringify({
          name,
          version: '1.0.0',
          type: 'module',
          types: './dist/index.d.ts',
          exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
        }),
      )
      await put(join(base, entry.path, 'src/index.ts'), 'export {}\n')
    }
    const link = join(live, 'node_modules', name)
    await mkdir(dirname(link), { recursive: true })
    await symlink(join(live, entry.path), link, 'dir')
  }
  // Like the release/hook export: dependency installs link back to the live tree.
  await symlink(join(live, 'node_modules'), join(tree, 'node_modules'), 'dir')
  // generateDocs formats with the Prettier config resolved from the README's path. A molecule tree carries its
  // own (single quotes, no semicolons); without one here the result depends on whatever config sits above tmpdir.
  await put(join(tree, '.prettierrc'), JSON.stringify({ singleQuote: true, semi: false }))
  await put(
    join(tree, siblingPath, 'src/index.ts'),
    "/** Committed source documentation. */\nexport interface PublicOptions { source: 'committed' }\n",
  )
  await put(
    join(live, siblingPath, 'src/index.ts'),
    "/** Uncommitted worktree documentation. */\nexport interface PublicOptions { source: 'worktree' }\n",
  )
  await put(
    join(live, siblingPath, 'dist/index.d.ts'),
    "/** Stale installed documentation. */\nexport interface PublicOptions { source: 'stale' }\n",
  )
  await put(join(tree, consumerPath, 'src/index.ts'), `${reexport}\n`)
  await put(join(tree, facadePath, 'src/index.ts'), `export * from '${consumer}'\n`)
  return {
    tree,
    live,
    registry: {
      version: 1,
      packages: Object.fromEntries(
        Object.entries(packages).map(([name, entry]) => [
          name,
          { ...entry, label: name, description: 'Source resolution fixture.' },
        ]),
      ),
    } as Registry,
  }
}

async function readme(
  context: Awaited<ReturnType<typeof fixture>>,
  name = consumer,
): Promise<string> {
  const docs = await generateDocs(context.registry, context.tree, [name])
  expect(docs).toHaveLength(1)
  return docs[0].md
}

function largeInterface(doc: string): string {
  return `/** ${doc} */\nexport interface LargeOptions {\n${Array.from(
    { length: 500 },
    (_, i) => `  member${i}: string`,
  ).join('\n')}\n}\n`
}

describe('README resolution from the documented source tree', () => {
  it('documents a variadic source function with a rest argument rather than an optional array', async () => {
    const context = await fixture()
    await put(
      join(context.tree, siblingPath, 'src/index.ts'),
      '/** Join words. */\nexport const joinWords = (...words: string[]): string => words.join(" ")\n',
    )
    const md = await readme(context, sibling)
    expect(md).toContain('function joinWords(...words: string[]): string')
    expect(md).not.toContain('words?: string[]')
  })

  it('uses sibling source despite stale dist and a different live worktree', async () => {
    const context = await fixture()
    const md = await readme(context)
    expect(md).toContain('Committed source documentation.')
    expect(md).toContain("source: 'committed'")
    expect(md).not.toContain('Stale installed documentation.')
    expect(md).not.toContain('Uncommitted worktree documentation.')
  })

  it('resolves siblings without any installed sibling build', async () => {
    const context = await fixture()
    await rm(join(context.live, siblingPath, 'dist'), { recursive: true })
    expect(await readme(context)).toContain('Committed source documentation.')
  })

  it('checks the same source bytes and detects a later source change', async () => {
    const context = await fixture()
    await put(
      join(context.tree, consumerPath, 'README.md'),
      (await readme(context))
        .replace('Stale installed documentation.', 'Committed source documentation.')
        .replace("source: 'stale'", "source: 'committed'"),
    )
    expect(await checkDocsSerial(context.registry, context.tree, [consumer])).toEqual({
      checked: [consumer],
      different: [],
    })
    await put(
      join(context.tree, siblingPath, 'src/index.ts'),
      '/** New source documentation. */\nexport interface PublicOptions { updated: true }\n',
    )
    expect(await checkDocsSerial(context.registry, context.tree, [consumer])).toEqual({
      checked: [consumer],
      different: [consumer],
    })
  })

  it('follows transitive re-exports and import-then-export aliases in the export tree', async () => {
    const context = await fixture(
      `import type { PublicOptions as Options } from '${sibling}'\nexport type { Options }`,
    )
    // The installed consumer is stale too. The facade must not enter that tree.
    await put(
      join(context.live, consumerPath, 'dist/index.d.ts'),
      `export type { PublicOptions as Options } from '${sibling}'\n`,
    )
    const relations = discoverReexporters(context.registry, context.tree)
    expect(relations.get(sibling)).toEqual([consumer])
    expect(relations.get(consumer)).toEqual([facade])
    const md = await readme(context, facade)
    expect(md).toContain('Committed source documentation.')
    expect(md).toContain('`Options`')
    expect(md).not.toContain('Stale installed documentation.')
  })

  it('resolves an exported subpath to its source target including TSX', async () => {
    const context = await fixture(`export * from '${sibling}/configuration'`)
    const manifest = join(context.tree, siblingPath, 'package.json')
    const pkg = JSON.parse(await readFile(manifest, 'utf8'))
    pkg.exports['./configuration'] = {
      types: './dist/components/Options.d.ts',
      import: './dist/components/Options.js',
    }
    await put(manifest, JSON.stringify(pkg))
    await put(
      join(context.tree, siblingPath, 'src/components/Options.tsx'),
      '/** Source subpath documentation. */\nexport interface SubpathOptions { correct: true }\n',
    )
    expect(await readme(context)).toContain('Source subpath documentation.')
  })

  it('regenerates transitive subpath re-exporters when only their sibling is in scope', async () => {
    const context = await fixture(`export * from '${sibling}/configuration'`)
    const manifest = join(context.tree, siblingPath, 'package.json')
    const pkg = JSON.parse(await readFile(manifest, 'utf8'))
    pkg.exports['./configuration'] = { types: './dist/settings.d.ts' }
    await put(manifest, JSON.stringify(pkg))
    await put(
      join(context.tree, siblingPath, 'src/settings.ts'),
      '/** Current settings documentation. */\nexport interface Settings { current: true }\n',
    )
    const registryPath = join(dirname(context.tree), 'registry.json')
    await put(registryPath, JSON.stringify(context.registry))
    const script = fileURLToPath(
      new URL('../../../scripts/regen-molecule-docs.mjs', import.meta.url),
    )
    const generated = execFileSync(process.execPath, ['--import', 'tsx', script, siblingPath], {
      env: {
        ...process.env,
        MOLECULE_PACKAGES_DIR: join(context.tree, 'packages'),
        MLCL_REGISTRY_PATH: registryPath,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    expect(generated).toContain(`${consumerPath}/README.md`)
    expect(generated).toContain(`${facadePath}/README.md`)
    expect(await readFile(join(context.tree, facadePath, 'README.md'), 'utf8')).toContain(
      'Current settings documentation.',
    )
  })

  it('resolves wildcard source exports from the documented manifest', async () => {
    const context = await fixture(`export * from '${sibling}/optional/settings.js'`)
    const manifest = join(context.tree, siblingPath, 'package.json')
    const pkg = JSON.parse(await readFile(manifest, 'utf8'))
    pkg.exports['./optional/*.js'] = { types: './dist/pieces/*.d.ts' }
    await put(manifest, JSON.stringify(pkg))
    await put(
      join(context.tree, siblingPath, 'src/pieces/settings.ts'),
      '/** Source wildcard documentation. */\nexport interface Settings { enabled: true }\n',
    )
    expect(await readme(context)).toContain('Source wildcard documentation.')
  })

  it('uses source through the real sync-docs:changed regenerator and its check mode', async () => {
    const context = await fixture()
    execFileSync('git', ['init', '-q', context.tree])
    const registryPath = join(dirname(context.tree), 'registry.json')
    await put(registryPath, JSON.stringify(context.registry))
    const script = fileURLToPath(
      new URL('../../../scripts/regen-molecule-docs.mjs', import.meta.url),
    )
    const args = ['--import', 'tsx', script, '--changed']
    const options = {
      env: {
        ...process.env,
        MOLECULE_PACKAGES_DIR: join(context.tree, 'packages'),
        MLCL_REGISTRY_PATH: registryPath,
      },
      encoding: 'utf8' as const,
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
    }
    const generated = execFileSync(process.execPath, args, options)
    expect(generated).toContain(`${consumerPath}/README.md`)
    const md = await readFile(join(context.tree, consumerPath, 'README.md'), 'utf8')
    expect(md).toContain('Committed source documentation.')
    expect(md).not.toContain('Stale installed documentation.')
    expect(execFileSync(process.execPath, [...args, '--check'], options)).toBe('')
  })

  it('refuses a missing source subpath instead of falling back to stale dist', async () => {
    const context = await fixture(`export * from '${sibling}/removed.js'`)
    for (const base of [context.tree, context.live]) {
      const path = join(base, siblingPath, 'package.json')
      const pkg = JSON.parse(await readFile(path, 'utf8'))
      pkg.exports['./removed.js'] = { types: './dist/removed.d.ts' }
      await put(path, JSON.stringify(pkg))
    }
    await put(
      join(context.live, siblingPath, 'dist/removed.d.ts'),
      '/** Removed source still in dist. */\nexport interface Removed { stale: true }\n',
    )
    await expect(readme(context)).rejects.toThrow(/source.*@molecule\/app-doc-source\/removed\.js/)
  })

  it('leaves unresolved asset URL imports to TypeScript without rejecting the package API', async () => {
    const context = await fixture()
    await put(
      join(context.tree, siblingPath, 'src/__tests__/asset.test.ts'),
      `import fontUrl from '${sibling}/fonts/icon.woff?url'\nexport const font = fontUrl\n`,
    )
    const md = await readme(context, sibling)
    expect(md).toContain('Committed source documentation.')
    expect(md).not.toContain('fontUrl')
  })

  it('keeps third-party re-exports on their installed declarations', async () => {
    const context = await fixture("export * from 'foreign-doc-types'")
    await put(
      join(context.live, 'node_modules/foreign-doc-types/package.json'),
      JSON.stringify({ name: 'foreign-doc-types', types: './index.d.ts' }),
    )
    await put(
      join(context.live, 'node_modules/foreign-doc-types/index.d.ts'),
      '/** Installed third-party documentation. */\nexport interface ForeignOptions { installed: true }\n',
    )
    expect(await readme(context)).toContain('Installed third-party documentation.')
  })

  it('keeps Molecule dependencies absent from the source tree on installed declarations', async () => {
    const context = await fixture("export * from '@molecule/app-external-doc-types'")
    const external = join(context.live, 'node_modules/@molecule/app-external-doc-types')
    await put(
      join(external, 'package.json'),
      JSON.stringify({ name: '@molecule/app-external-doc-types', types: './index.d.ts' }),
    )
    await put(
      join(external, 'index.d.ts'),
      '/** Installed external Molecule documentation. */\nexport interface ExternalOptions {}\n',
    )
    expect(await readme(context)).toContain('Installed external Molecule documentation.')
  })

  it.each(['module', 'commonjs', 'explicit-require'])(
    'respects NodeNext conditions for third-party declarations in %s',
    async (mode) => {
      const context = await fixture(
        mode === 'explicit-require'
          ? 'export type { ConditionalOptions } from \'conditional-doc-types\' with { "resolution-mode": "require" }'
          : "export * from 'conditional-doc-types'",
      )
      if (mode === 'commonjs') {
        const manifest = join(context.tree, consumerPath, 'package.json')
        const pkg = JSON.parse(await readFile(manifest, 'utf8'))
        pkg.type = 'commonjs'
        await put(manifest, JSON.stringify(pkg))
      }
      const external = join(context.live, 'node_modules/conditional-doc-types')
      await put(
        join(external, 'package.json'),
        JSON.stringify({
          name: 'conditional-doc-types',
          type: 'module',
          exports: {
            import: { types: './esm.d.ts' },
            require: { types: './cjs.d.cts' },
          },
        }),
      )
      await put(
        join(external, 'esm.d.ts'),
        '/** Installed ESM documentation. */\nexport interface ConditionalOptions {}\n',
      )
      await put(
        join(external, 'cjs.d.cts'),
        '/** Installed CommonJS documentation. */\nexport interface ConditionalOptions {}\n',
      )
      const md = await readme(context)
      expect(md).toContain(
        mode === 'module' ? 'Installed ESM documentation.' : 'Installed CommonJS documentation.',
      )
      expect(md).not.toContain(
        mode === 'module' ? 'Installed CommonJS documentation.' : 'Installed ESM documentation.',
      )
    },
  )

  it.each(['sibling', 'third-party'])(
    'points a truncated %s declaration at a real installed file',
    async (kind) => {
      const context = await fixture(
        `export * from '${kind === 'sibling' ? sibling : 'foreign-doc-types'}'`,
      )
      const declaration = largeInterface('Full declaration documentation.')
      let expected: string
      if (kind === 'sibling') {
        await put(join(context.tree, siblingPath, 'src/types.ts'), declaration)
        await put(join(context.tree, siblingPath, 'src/index.ts'), "export * from './types.js'\n")
        await put(join(context.live, siblingPath, 'dist/types.d.ts'), declaration)
        await put(
          join(context.live, siblingPath, 'dist/index.d.ts'),
          "export * from './types.js'\n",
        )
        expected = `node_modules/${sibling}/dist/types.d.ts`
      } else {
        const external = join(context.live, 'node_modules/foreign-doc-types')
        await put(
          join(external, 'package.json'),
          JSON.stringify({ name: 'foreign-doc-types', types: './types.d.ts' }),
        )
        await put(join(external, 'types.d.ts'), declaration)
        expected = 'node_modules/foreign-doc-types/types.d.ts'
      }
      const md = await readme(context)
      expect(md).toContain(`the full declaration is in ${expected}`)
      expect(existsSync(join(context.tree, expected))).toBe(true)
      expect(await readFile(join(context.tree, expected), 'utf8')).toContain('member499: string')
    },
  )
})
