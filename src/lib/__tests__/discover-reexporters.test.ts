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
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { discoverReexporters } from '../docs-sync.js'
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

  // The live fleet is the only tree that can answer "did the rewrite lose
  // anything?" — 33 re-export lines across ~22k files. Skipped in a checkout
  // without the sibling molecule repo (isolated mlcl CI).
  it.skipIf(!moleculePresent)('matches what git grep finds in the live checkout', () => {
    const registry = JSON.parse(readFileSync(join(MLCL_ROOT, 'registry.json'), 'utf8')) as Registry

    const viaWalk = discoverReexporters(registry, MOLECULE_ROOT)
    const viaGit = new Map<string, string[]>()
    const out = execFileSync(
      'git',
      [
        '-C',
        MOLECULE_ROOT,
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
    for (const line of out.split('\n')) {
      const sep = line.indexOf(':')
      if (sep === -1) continue
      const file = line.slice(0, sep)
      if (!file.includes('/src/')) continue
      const target = line.slice(sep + 1).match(/'(@molecule\/[a-z0-9-]+)'/)?.[1]
      const reexporter = nameByPath.get(file.replace(/\/src\/.*$/, ''))
      if (!target || !reexporter || target === reexporter || !registry.packages[target]) continue
      const list = viaGit.get(target) ?? []
      if (!list.includes(reexporter)) list.push(reexporter)
      viaGit.set(target, list)
    }

    expect(viaGit.size).toBeGreaterThan(0)
    expect([...viaWalk].sort()).toEqual([...viaGit].sort())
  })
})

// Cleanup runs last so a failing assertion still leaves nothing behind.
process.on('exit', () => {
  for (const dir of tempDirs) rm(dir, { recursive: true, force: true }).catch(() => {})
})
