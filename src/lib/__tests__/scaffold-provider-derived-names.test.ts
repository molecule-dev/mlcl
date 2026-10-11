// @vitest-environment node
/**
 * A provider package scaffolded by `mlcl init` must declare ONE provider class
 * and export THAT name.
 *
 * `scaffoldProvider` used to take the calling package's whole-name Pascal form
 * (`pascalName`) as an argument it never read: a provider's two identifiers are
 * DERIVED from the package name instead — the label segment (`mysql` →
 * `Mysql`) and the category segment (`database` → `Database`) — so
 * `@molecule/api-database-mysql` becomes `MysqlDatabaseProvider`, and the
 * `<category>Provider` interface it implements comes from the `implements`
 * field of its own metadata.
 *
 * The two files are generated from two templates that must agree: `provider.ts`
 * declares the class, `index.ts` re-exports it. Nothing asserted that pairing,
 * so a name derived differently on either side would ship a package whose
 * `index.ts` exports a symbol `provider.ts` does not declare (TS2305 on the
 * package's own first `tsc`). Driven through the real `scaffoldPackage` against
 * a temp directory; nothing outside it is written.
 *
 * @module
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { InferredMetadata } from '../infer.js'
import { scaffoldPackage } from '../scaffold.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-provider-scaffold-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** The metadata `mlcl init` infers for a database bond package. */
const MYSQL_PROVIDER: InferredMetadata = {
  name: 'api-database-mysql',
  type: 'provider',
  stack: 'api',
  category: 'database',
  label: 'MySQL',
  description: 'MySQL database bond',
  implements: '@molecule/api-database',
  secrets: [],
  tables: [],
}

describe('scaffoldPackage — a provider’s identifiers are derived from its package name', () => {
  it('names the provider after the label segment and the category segment', async () => {
    const result = await scaffoldPackage(dir, MYSQL_PROVIDER)

    // Non-vacuity: the branch that ran wrote the provider's own three files.
    expect(result.files).toContain('src/provider.ts')
    expect(result.files).toContain('src/index.ts')

    const provider = await readFile(join(dir, 'src', 'provider.ts'), 'utf-8')
    expect(provider).toContain('export class MysqlDatabaseProvider')
    expect(provider).toContain('MysqlDatabaseProvider implements DatabaseProvider')
    // The label the class reports is the package's own last segment, never the
    // whole package name.
    expect(provider).toContain("readonly name = 'mysql'")
    // `implements` is the interface package, imported as a type.
    expect(provider).toContain("from '@molecule/api-database'")
  })

  it('re-exports exactly the class provider.ts declares', async () => {
    await scaffoldPackage(dir, MYSQL_PROVIDER)

    const provider = await readFile(join(dir, 'src', 'provider.ts'), 'utf-8')
    const declared = /export class ([A-Za-z0-9_$]+)/.exec(provider)?.[1]
    expect(declared, 'provider.ts must declare the provider class').toBeDefined()

    const index = await readFile(join(dir, 'src', 'index.ts'), 'utf-8')
    expect(
      index,
      `index.ts must re-export ${declared} — a differently derived name there is a TS2305 in the package it just scaffolded`,
    ).toContain(declared as string)

    // …and the same for the factory the templates pair with the class.
    expect(provider).toContain(`export function createProvider`)
    expect(index).toContain('createProvider')
  })
})
