import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { companionLocaleFor, documentedRegistry, generateDocs } from '../docs-sync.js'
import type { Registry, RegistryEntry } from '../schema.js'

// A package awaiting its first release sits in `pendingPackages`, outside the installable catalog. Its README
// still ships with that first publish, and a feature whose locale bond is pending still has that companion.
const feature = '@molecule/app-doc-feature'
const locale = '@molecule/app-locales-doc-feature'
const pendingPort = '@molecule/app-doc-feature-vue'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

const entry = (path: string, type: string): RegistryEntry =>
  ({
    path,
    type,
    stack: 'app',
    category: 'docs',
    label: path,
    description: 'Pending publication fixture.',
  }) as RegistryEntry

async function put(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

/** A tree with one published feature whose locale bond and Vue port both await their first release. */
async function fixture(): Promise<{ tree: string; registry: Registry }> {
  const tree = await mkdtemp(join(tmpdir(), 'docs-pending-packages-'))
  roots.push(tree)
  const packages = {
    [feature]: entry('packages/app/features/doc-feature', 'feature'),
  }
  const pendingPackages = {
    [locale]: entry('packages/app/locales/doc-feature', 'locales'),
    [pendingPort]: entry('packages/app/features/doc-feature-vue', 'feature'),
  }
  for (const [name, e] of Object.entries({ ...packages, ...pendingPackages })) {
    await put(
      join(tree, e.path, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', type: 'module' }),
    )
    await put(
      join(tree, e.path, 'src/index.ts'),
      `/** The ${name} entry point. */\nexport const answer = 42\n`,
    )
  }
  await put(join(tree, '.prettierrc'), JSON.stringify({ singleQuote: true, semi: false }))
  return { tree, registry: { version: 1, packages, pendingPackages } as unknown as Registry }
}

describe('documentedRegistry', () => {
  it('adds every pending package to the documented packages', async () => {
    const { registry } = await fixture()
    expect(Object.keys(documentedRegistry(registry).packages).sort()).toEqual(
      [feature, locale, pendingPort].sort(),
    )
  })

  it('keeps the installable declaration of a name found in both maps', async () => {
    const { registry } = await fixture()
    const installable = { ...registry.packages[feature], label: 'installable' }
    const both = {
      ...registry,
      packages: { [feature]: installable },
      pendingPackages: { [feature]: { ...installable, label: 'pending' } },
    } as Registry
    expect(documentedRegistry(both).packages[feature].label).toBe('installable')
  })

  it('returns a registry without pending packages unchanged', async () => {
    const { registry } = await fixture()
    const none = { ...registry, pendingPackages: undefined } as Registry
    expect(documentedRegistry(none)).toBe(none)
  })
})

describe('docs for packages awaiting their first release', () => {
  it('finds a feature locale bond that is still pending', async () => {
    const { registry } = await fixture()
    expect(
      companionLocaleFor(feature, registry.packages[feature], documentedRegistry(registry)),
    ).toBe(locale)
  })

  it("names a pending locale bond in the feature's README", async () => {
    const { tree, registry } = await fixture()
    const [doc] = await generateDocs(registry, tree, [feature])
    expect(doc.md).toContain(`Translation strings are provided by \`${locale}\``)
  })

  it('generates the README of a pending package', async () => {
    const { tree, registry } = await fixture()
    const docs = await generateDocs(registry, tree, [pendingPort])
    expect(docs.map((d) => d.name)).toEqual([pendingPort])
    expect(docs[0].md).toContain('answer')
  })
})
