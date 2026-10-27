/**
 * Which packages embed another package's API in their README.
 *
 * The relation is read from the tree being documented, so the release's docs
 * gate — which generates from a `git archive` export with no `.git` — sees the
 * same set the live checkout does. Under the old `git grep` discovery the export
 * reported ZERO re-exports: the command ran against the surrounding workspace
 * repo, which tracks no file under the export, so it exited 1 with no matches
 * and was read as "no re-exporters" — silently narrowing the gate. Pointed at an
 * export outside any repo it crashed outright with `fatal: not a git repository`.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { stripGeneratedTimestamp } from '../docs-generator.js'
import { discoverReexporters, generateDocs } from '../docs-sync.js'
import type { Registry, RegistryEntry } from '../schema.js'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const MOLECULE_ROOT = join(MLCL_ROOT, '..', 'molecule')
const moleculePresent = existsSync(join(MOLECULE_ROOT, 'packages'))

const tempDirs: string[] = []
async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `docs-reexporters-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

/** A registry holding just the packages a fixture needs. */
function registryOf(paths: Record<string, string>): Registry {
  const packages: Record<string, RegistryEntry> = {}
  for (const [name, path] of Object.entries(paths)) {
    packages[name] = {
      language: 'typescript',
      runtime: 'node',
      type: 'utility',
      category: 'fixtures',
      label: name,
      description: 'fixture',
      stack: 'api',
      path,
    }
  }
  return { version: 1, packages }
}

/** A tree laid out like molecule's, with the given source files written under `packages/`. */
async function writeTree(root: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
}

const FILES = {
  'packages/api/source/src/index.ts': `/**
 * Fixture source.
 * @module
 */
export * as helpers from './helpers.js'
`,
  'packages/api/source/src/helpers.ts': 'export declare const help: () => void\n',
  'packages/api/embedder/src/index.ts': `/**
 * Fixture embedder — re-exports the source package's API into its own README.
 * @module
 */
export * as source from '@molecule/api-source'
export { helper } from '@molecule/api-source'
`,
  'packages/api/unrelated/src/index.ts': `/**
 * Fixture bystander.
 * @module
 */
export const nothing = 1
`,
}

/**
 * Independent Git-enumerated direct-declaration subset of the filesystem discovery.
 * Git locates candidates; TypeScript distinguishes declarations from fixture text.
 *
 * @param registry - Package identities and paths for this tree.
 * @param moleculeRoot - Checkout whose sources Git reads.
 * @returns Direct re-export relationships declared in those sources.
 */
function directReexportersFromGit(registry: Registry, moleculeRoot: string): Map<string, string[]> {
  const viaGit = new Map<string, string[]>()
  const out = execFileSync(
    'git',
    [
      '-C',
      moleculeRoot,
      'grep',
      '--untracked',
      '-oE',
      String.raw`export (\* (as [A-Za-z0-9_]+ )?|(type )?\{[^}]*\} )?from '@molecule/[a-z0-9-]+'`,
      '--',
      'packages',
    ],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  )
  const nameByPath = new Map<string, string>()
  for (const [name, entry] of Object.entries(registry.packages)) {
    nameByPath.set(entry.path.replace(/\/+$/, ''), name)
  }
  const declaredByFile = new Map<string, Set<string>>()
  for (const line of out.split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const file = line.slice(0, sep)
    if (!file.includes('/src/') || !/\.tsx?$/.test(file)) continue
    const target = line.slice(sep + 1).match(/'(@molecule\/[a-z0-9-]+)'/)?.[1]
    const reexporter = nameByPath.get(file.replace(/\/src\/.*$/, ''))
    if (!target || !reexporter || target === reexporter || !registry.packages[target]) continue
    let declared = declaredByFile.get(file)
    if (!declared) {
      declared = new Set<string>()
      const source = ts.createSourceFile(
        file,
        readFileSync(join(moleculeRoot, file), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      )
      for (const statement of source.statements) {
        if (
          ts.isExportDeclaration(statement) &&
          statement.moduleSpecifier &&
          ts.isStringLiteral(statement.moduleSpecifier)
        ) {
          declared.add(statement.moduleSpecifier.text)
        }
      }
      declaredByFile.set(file, declared)
    }
    if (!declared.has(target)) continue
    const list = viaGit.get(target) ?? []
    if (!list.includes(reexporter)) list.push(reexporter)
    viaGit.set(target, list)
  }

  return viaGit
}

describe('discoverReexporters', () => {
  it('keys the packages that re-export a package, and nothing else', async () => {
    const root = await tempDir('live')
    await writeTree(root, FILES)

    const found = discoverReexporters(
      registryOf({
        '@molecule/api-source': 'packages/api/source',
        '@molecule/api-embedder': 'packages/api/embedder',
        '@molecule/api-unrelated': 'packages/api/unrelated',
      }),
      root,
    )

    expect(found.get('@molecule/api-source')).toEqual(['@molecule/api-embedder'])
    expect(found.size).toBe(1)
  })

  it('counts direct declarations without treating fixture strings or comments as re-exports', async () => {
    const root = await tempDir('git-oracle')
    const core = '@molecule/api-source'
    const wrapper = '@molecule/api-embedder'
    const fixtureOnly = '@molecule/api-fixture-only'
    const commentOnly = '@molecule/api-comment-only'
    const registry = registryOf({
      [core]: 'packages/api/source',
      [wrapper]: 'packages/api/embedder',
      [fixtureOnly]: 'packages/api/fixture-only',
      [commentOnly]: 'packages/api/comment-only',
    })
    await writeTree(root, {
      ...FILES,
      'packages/api/fixture-only/src/control.test.ts': `export const fixture = "export * from '@molecule/api-source'"\n`,
      'packages/api/comment-only/src/index.ts': `/*\nexport * from '@molecule/api-source'\n*/\nexport const ready = true\n`,
    })
    execFileSync('git', ['init', '-q'], { cwd: root })
    const direct = directReexportersFromGit(registry, root)
    expect(direct.get(core)).toEqual([wrapper])
    expect(discoverReexporters(registry, root)).toEqual(direct)
  })

  it('finds the same relation in a `git archive` export, which has no .git', async () => {
    const repo = await tempDir('repo')
    await writeTree(repo, FILES)
    execFileSync('git', ['init', '-q'], { cwd: repo })
    execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=T', 'add', '-A'], {
      cwd: repo,
    })
    execFileSync(
      'git',
      ['-c', 'user.email=t@example.com', '-c', 'user.name=T', 'commit', '-qm', 'fixture'],
      { cwd: repo },
    )

    const exportDir = await tempDir('export')
    execFileSync('bash', ['-c', `git -C ${repo} archive HEAD | tar -x -C ${exportDir}`])
    expect(existsSync(join(exportDir, '.git'))).toBe(false)

    const registry = registryOf({
      '@molecule/api-source': 'packages/api/source',
      '@molecule/api-embedder': 'packages/api/embedder',
    })
    expect(discoverReexporters(registry, exportDir)).toEqual(discoverReexporters(registry, repo))
  })

  it('throws rather than reporting an empty relation when the tree has no packages/', async () => {
    const empty = await tempDir('empty')

    expect(() => discoverReexporters(registryOf({}), empty)).toThrow(/no packages\/ directory/)
  })

  it('refreshes the scoped README of a wrapper that locally re-exports an imported public type', async () => {
    const root = await tempDir('local-public-types')
    const core = '@molecule/api-source'
    const wrapper = '@molecule/api-wrapper'
    const privateImporter = '@molecule/api-private-importer'
    const unrelated = '@molecule/api-unrelated'
    const registry = registryOf({
      [core]: 'packages/api/source',
      [wrapper]: 'packages/api/wrapper',
      [privateImporter]: 'packages/api/private-importer',
      [unrelated]: 'packages/api/unrelated',
    })
    await writeTree(root, {
      'packages/api/source/src/index.ts':
        '/** Core. @module */\nexport interface Client { value: string }\n',
      'packages/api/wrapper/src/index.ts': `/** Wrapper. @module */
import type { Client as CoreClient } from '@molecule/api-source'
export type {
  CoreClient as Client,
}
export function getClient(): CoreClient { throw new Error('Fixture only') }
`,
      'packages/api/private-importer/src/index.ts': `/** Private import. @module */
import type { Client } from '@molecule/api-source'
const privateClient: Client | null = null
export const ready = true
`,
      'packages/api/unrelated/src/index.ts': '/** Unrelated. @module */\nexport const value = 1\n',
    })
    for (const [name, entry] of Object.entries(registry.packages)) {
      await writeFile(
        join(root, entry.path, 'package.json'),
        JSON.stringify({
          name,
          version: '1.0.0',
          type: 'module',
          types: './src/index.ts',
        }),
      )
    }
    await mkdir(join(root, 'node_modules/@molecule'), { recursive: true })
    await symlink(
      join(root, 'packages/api/source'),
      join(root, 'node_modules/@molecule/api-source'),
    )
    const initial = (await generateDocs(registry, root)).find((doc) => doc.name === wrapper)!
    await writeFile(initial.readmePath, initial.md)
    await writeFile(
      join(root, 'packages/api/source/src/index.ts'),
      '/** Core. @module */\nexport interface Client { value: string; revision(): number }\n',
    )
    const names = [core, ...(discoverReexporters(registry, root).get(core) ?? [])]
    const scoped = await generateDocs(registry, root, names)
    const current = (await generateDocs(registry, root)).find((doc) => doc.name === wrapper)!
    expect(current.md).toContain('revision(): number')
    expect(stripGeneratedTimestamp(current.md)).not.toBe(stripGeneratedTimestamp(initial.md))
    expect(names).not.toContain(privateImporter)
    expect(names).not.toContain(unrelated)
    const refreshed = scoped.find((doc) => doc.name === wrapper)
    expect(
      refreshed,
      'Core changed, but the wrapper README remains stale outside the selected scope',
    ).toBeDefined()
    expect(stripGeneratedTimestamp(refreshed!.md)).toBe(stripGeneratedTimestamp(current.md))
  })

  // The live fleet is the only tree that can answer "did the rewrite lose
  // anything?" — 33 re-export lines across ~22k files. Skipped in a checkout
  // without the sibling molecule repo (isolated mlcl CI).
  it.skipIf(!moleculePresent)(
    'preserves direct re-exports and adds local imported types in the live checkout',
    () => {
      const registry = JSON.parse(
        readFileSync(join(MLCL_ROOT, 'registry.json'), 'utf8'),
      ) as Registry

      const viaWalk = discoverReexporters(registry, MOLECULE_ROOT)
      const viaGit = directReexportersFromGit(registry, MOLECULE_ROOT)

      expect(viaGit.size).toBeGreaterThan(0)
      for (const [target, reexporters] of viaGit) {
        expect(viaWalk.get(target)).toEqual(expect.arrayContaining(reexporters))
      }
      expect(viaWalk.get('@molecule/app-auth')).toEqual(
        expect.arrayContaining([
          '@molecule/app-angular',
          '@molecule/app-solid',
          '@molecule/app-svelte',
          '@molecule/app-vue',
        ]),
      )
    },
  )
})

// Cleanup runs last so a failing assertion still leaves nothing behind.
process.on('exit', () => {
  for (const dir of tempDirs) rm(dir, { recursive: true, force: true }).catch(() => {})
})
