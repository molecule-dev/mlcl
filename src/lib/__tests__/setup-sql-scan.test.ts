/**
 * `scanSetupSqlBundle` / `scanSetupSqlFiles` — the scanner's derivation of a
 * package's setup-SQL bytes AND the package version they belong to, the value
 * `sync-registry --scan-tables` bundles into the registry entry.
 *
 * The bundle must be the EXACT text (a stale copy is worse than none: a
 * `--skip-install` scaffold on a host with no package copy writes it straight
 * into `__setup__/`, which the generated migration runner replays at boot), it
 * must come from the same directory {@link scanForTables} reads so the declared
 * paths and the bytes can never disagree, and it must be TAGGED with the version
 * its own package.json declares — a bundle without that tag cannot be bound to a
 * selection and must never be written.
 *
 * @module
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { scanForTables, scanSetupSqlBundle, scanSetupSqlFiles } from '../scanner.js'

const roots: string[] = []
const scratch = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'mlcl-setup-sql-scan-'))
  roots.push(root)
  return root
}
const writeSql = (packagePath: string, relativePath: string, sql: string): void => {
  const target = join(packagePath, relativePath)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, sql)
}
const writeVersion = (packagePath: string, version: unknown): void => {
  writeFileSync(
    join(packagePath, 'package.json'),
    `${JSON.stringify({ name: '@molecule/api-demo', version }, null, 2)}\n`,
  )
}

afterAll(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const USERS = `CREATE TABLE IF NOT EXISTS "users" ("id" UUID PRIMARY KEY);\n`
const POSTS = `-- posts\nCREATE TABLE "posts" ("id" UUID PRIMARY KEY);\n`

describe('scanSetupSqlBundle', () => {
  it('bundles the exact bytes of every declared file, keyed by package-relative path, tagged with the package version', async () => {
    const pkg = scratch()
    writeVersion(pkg, '1.2.2')
    writeSql(pkg, 'src/__setup__/users.sql', USERS)
    writeSql(pkg, 'src/__setup__/posts.sql', POSTS)
    // A second setup directory is never read once `src/__setup__` declares
    // tables — the same order scanForTables applies.
    writeSql(pkg, 'setup/legacy.sql', USERS)

    const tables = await scanForTables(pkg)
    expect(tables.map((table) => table.name).sort()).toEqual(['posts', 'users'])

    // The version and the bytes are ONE value: the registry bundles both, and a
    // selection may only use them for this exact version.
    expect(await scanSetupSqlBundle(pkg)).toEqual({
      version: '1.2.2',
      files: {
        'src/__setup__/posts.sql': POSTS,
        'src/__setup__/users.sql': USERS,
      },
    })
    // The byte-map helper stays the byte map.
    expect(await scanSetupSqlFiles(pkg)).toEqual({
      'src/__setup__/posts.sql': POSTS,
      'src/__setup__/users.sql': USERS,
    })
  })

  it('reads the legacy root `setup/` directory when src/__setup__ has no tables', async () => {
    const pkg = scratch()
    writeVersion(pkg, '1.0.0')
    // A comment-only file in src/__setup__ cannot satisfy a table declaration.
    writeSql(pkg, 'src/__setup__/notes.sql', '-- nothing to create\n')
    writeSql(pkg, 'setup/audit_log.sql', POSTS)

    expect(await scanSetupSqlBundle(pkg)).toEqual({
      version: '1.0.0',
      files: { 'setup/audit_log.sql': POSTS },
    })
  })

  it('returns null for a package that ships no setup SQL', async () => {
    const pkg = scratch()
    writeVersion(pkg, '1.0.0')
    writeSql(pkg, 'src/index.ts', 'export const provider = {}\n')
    expect(await scanSetupSqlBundle(pkg)).toBeNull()
    expect(await scanSetupSqlFiles(pkg)).toBeNull()
  })

  it('refuses to tag a bundle with no readable package.json', async () => {
    // An untagged bundle is unusable: nothing can say which version's schema it
    // is, so writing it would defer the failure to scaffold time.
    const pkg = scratch()
    writeSql(pkg, 'src/__setup__/users.sql', USERS)
    await expect(scanSetupSqlBundle(pkg)).rejects.toThrow(/cannot be tagged/)
  })

  it('refuses a version that is not exact', async () => {
    const pkg = scratch()
    writeVersion(pkg, '^1.2.2')
    writeSql(pkg, 'src/__setup__/users.sql', USERS)
    await expect(scanSetupSqlBundle(pkg)).rejects.toThrow(/declares no exact version/)
  })
})
