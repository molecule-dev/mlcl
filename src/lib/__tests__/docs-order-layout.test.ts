/**
 * A package's generated README must be the same document wherever the tree lives.
 *
 * The export order inside it is keyed by the file each declaration resolves to,
 * and a declaration outside the package resolves to the dependency's own
 * `node_modules` path. Keyed by ABSOLUTE path, that made the order depend on the
 * tree's location relative to its dependencies' — the same commit generated one
 * section order in the live checkout and another in a `git archive` export, which
 * is how the release's docs gate came to report three in-sync packages as stale
 * (release-L54/L55). See `sourceOrderKey` in api-extractor.ts.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { extractPackageApi } from '../api-extractor.js'

const tempDirs: string[] = []

afterAll(async () => {
  for (const dir of tempDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

/**
 * A package whose export list holds several NAMESPACES — the shape whose order
 * used to move with the tree.
 *
 * The extractor groups by kind first (interfaces, types, functions, …,
 * namespaces) and orders within a group by source, so only a group of two or
 * more namespaces exposes the key: `helpers` resolves inside the package and
 * `z` — `export { z }` of an imported `zod`, which api-resources/*'s schema.ts
 * does for real — resolves into `node_modules`, outside it.
 */
const PACKAGE_INDEX = `import { z } from 'zod'

export * as helpers from './helpers.js'

/**
 * Re-export zod for convenience.
 */
export { z }

export function alpha(): void {}
export function beta(): void {}
`

/** A minimal stand-in for `zod`: enough for `z` to resolve to a module namespace. */
async function writeZodStub(nodeModulesDir: string): Promise<void> {
  await mkdir(join(nodeModulesDir, 'zod'), { recursive: true })
  await writeFile(
    join(nodeModulesDir, 'zod', 'package.json'),
    JSON.stringify({ name: 'zod', version: '0.0.0', types: './index.d.ts' }),
  )
  await writeFile(join(nodeModulesDir, 'zod', 'index.d.ts'), `export * as z from './z.js'\n`)
  await writeFile(
    join(nodeModulesDir, 'zod', 'z.d.ts'),
    `export declare const string: () => string\n`,
  )
}

/**
 * A tree laid out like molecule's (`<tree>/packages/<stack>/…`) whose package
 * source is identical to every other tree's, at `<base>/<name>/`.
 *
 * The dependency is installed at `<base>/node_modules`, i.e. OUTSIDE every tree —
 * the way npm hoists it above the packages, and the way it resolved in the
 * release's export. That is what made two trees with identical sources disagree.
 */
async function writeTree(base: string, name: string): Promise<string> {
  const root = join(base, name)
  const pkgDir = join(root, 'packages', 'api', 'fixture')
  await mkdir(join(pkgDir, 'src'), { recursive: true })
  await writeFile(join(pkgDir, 'src', 'index.ts'), PACKAGE_INDEX)
  await writeFile(join(pkgDir, 'src', 'helpers.ts'), 'export declare const help: () => void\n')
  return root
}

describe('export order vs tree location', () => {
  it('orders identically in two trees whose names sort on either side of node_modules', async () => {
    const base = await mkdtemp(join(tmpdir(), 'docs-order-layout-'))
    tempDirs.push(base)
    await writeZodStub(join(base, 'node_modules'))

    // `a-` sorts before `node_modules` and `z-` after: with the pre-fix absolute
    // sort key the dependency's block came first in one tree and last in the
    // other. The names are the whole point of the fixture.
    const roots = [await writeTree(base, 'a-tree'), await writeTree(base, 'z-tree')]
    const orders = roots.map((root) =>
      extractPackageApi(join(root, 'packages', 'api', 'fixture'), { rootDir: root })
        .exports.filter((e) => e.kind === 'namespace')
        .map((e) => e.name),
    )

    // `node_modules/…` sorts before `packages/…`, which is the order the live
    // checkout produces (and the one the committed READMEs carry).
    expect(orders[0]).toEqual(['z', 'helpers'])
    expect(orders[1]).toEqual(orders[0])
  })
})
