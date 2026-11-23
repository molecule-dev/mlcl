/**
 * A README may name only `@molecule/*` packages that exist. body-parser-express sent uploads to
 * `@molecule/utilities-files`, which never existed, and Codex spent a failed `npx mlcl docs` on it
 * in the harness eval `add` (2026-11-23); ten more such names were found across the fleet.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { generateDocs, unknownPackageMentions } from '../docs-sync.js'
import type { Registry, RegistryEntry } from '../schema.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

const entry = (path: string, description = 'Fixture.'): RegistryEntry =>
  ({
    path,
    type: 'utility',
    stack: 'api',
    category: 'docs',
    label: path,
    description,
  }) as RegistryEntry

async function put(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

/** One package whose module JSDoc says `doc`, plus `@molecule/api-real-uploads`. */
async function fixture(
  doc: string,
  description?: string,
): Promise<{ tree: string; registry: Registry }> {
  const tree = await mkdtemp(join(tmpdir(), 'docs-unknown-packages-'))
  roots.push(tree)
  const packages = {
    '@molecule/api-parser': entry('packages/api/parser', description),
    '@molecule/api-real-uploads': entry('packages/api/real-uploads'),
  }
  for (const [name, e] of Object.entries(packages)) {
    await put(
      join(tree, e.path, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', type: 'module' }),
    )
    const text = name === '@molecule/api-parser' ? doc : 'Uploads.'
    // An empty module description makes the README use the registry description, as locale bonds do.
    const jsdoc = text ? `/**\n * ${text}\n *\n * @module\n */` : '/** @module */'
    await put(join(tree, e.path, 'src/index.ts'), `${jsdoc}\nexport const answer = 42\n`)
  }
  await put(join(tree, '.prettierrc'), JSON.stringify({ singleQuote: true, semi: false }))
  return { tree, registry: { version: 1, packages } as unknown as Registry }
}

describe('unknownPackageMentions', () => {
  const known = new Set(['@molecule/api-uploads', '@molecule/app-ui-react'])

  it('names each mention the registry lacks, once', () => {
    expect(
      unknownPackageMentions(
        'Use `@molecule/utilities-files`, not @molecule/api-uploads. See @molecule/utilities-files.',
        known,
      ),
    ).toEqual(['@molecule/utilities-files'])
  })

  it('reads a subpath import as its package, and skips globs and placeholders', () => {
    expect(
      unknownPackageMentions(
        "import x from '@molecule/app-ui-react/forms'; every @molecule/api-* package; " +
          '`@molecule/{stack}-locales-{name}`; @molecule/api-locales-<name>; @molecule/app-ui-*',
        known,
      ),
    ).toEqual([])
  })
})

describe('generateDocs', () => {
  it('refuses a README that names a package the registry does not have', async () => {
    const { tree, registry } = await fixture(
      'File parts are skipped: use `@molecule/utilities-files`.',
    )
    await expect(generateDocs(registry, tree)).rejects.toThrow(
      /packages\/api\/parser\/README\.md \(@molecule\/api-parser\): @molecule\/utilities-files/,
    )
  })

  it('refuses a registry description that names one', async () => {
    const { tree, registry } = await fixture(
      '',
      'Translations for @molecule/api-bond-parser in 79 languages',
    )
    await expect(generateDocs(registry, tree, ['@molecule/api-parser'])).rejects.toThrow(
      '@molecule/api-bond-parser',
    )
  })

  it('generates a README that names real packages', async () => {
    const { tree, registry } = await fixture(
      'File parts are skipped: use `@molecule/api-real-uploads`.',
    )
    const docs = await generateDocs(registry, tree)
    expect(docs.find((d) => d.name === '@molecule/api-parser')?.md).toContain(
      '@molecule/api-real-uploads',
    )
  })
})
