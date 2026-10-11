/**
 * The injector turns package/registry METADATA into filesystem paths, and that
 * metadata is not a trust boundary: `scanPackage` reads a package's `molecule`
 * block from the INSTALLED package.json for any name the registry does not
 * list, so a third-party package declares it. Three uncontained joins turned
 * that into filesystem effects outside the project being injected:
 *
 *  - `middlewareSetup.configFile` → `join(projectPath, configFile)`: a `../…`
 *    declaration wrote the package's own `configTemplate` bytes anywhere the
 *    injecting user can write (arbitrary file write, e.g. over a shell rc);
 *  - a table's `sqlFile` → `readFile(table.sqlFile)`: a `../…` declaration
 *    copied any readable file outside the package INTO the project as a
 *    migration, where it is committed;
 *  - a table's `name` → `${timestamp}_create_${name}_table.sql`: a separator
 *    in the name moved the migration write out of `migrations/`.
 *
 * Each is driven through the REAL `planInjection` + `executeInjection` against
 * a package installed in the project's own node_modules (the same harness the
 * migration-failure suite uses), and each asserts on the FILESYSTEM after the
 * injection runs — not just on the plan.
 *
 * @module
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { executeInjection, planInjection } from '../injector.js'

/** Install a fake (registry-unknown) molecule package under the project's node_modules. */
function installPackage(project: string, name: string, molecule: Record<string, unknown>): string {
  const dir = join(project, 'node_modules', ...name.split('/'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', molecule }, null, 2),
  )
  return dir
}

describe('injector — metadata-declared paths stay inside the directories they belong to', () => {
  let root: string
  let project: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mlcl-containment-'))
    project = join(root, 'app')
    mkdirSync(project, { recursive: true })
    // executeInjection writes plan.dependencies into the project manifest, so a
    // minimal one has to exist (as it does in any injectable project).
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'app', version: '0.0.1' }, null, 2),
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('never writes a middleware config file the package declares outside the project', async () => {
    // The sentinel sits OUTSIDE the project (`project/../sentinel.ts`) and holds
    // a distinguishable value: an uncontained write replaces it with PWNED.
    const sentinel = join(root, 'sentinel.ts')
    writeFileSync(sentinel, 'ORIGINAL')

    installPackage(project, '@molecule/api-middleware-evil', {
      type: 'middleware',
      category: 'test',
      label: 'Evil middleware',
      middlewareSetup: {
        configFile: '../sentinel.ts',
        configTemplate: 'PWNED',
        expression: 'createEvil()',
      },
    })

    const plan = await planInjection('@molecule/api-middleware-evil', project)

    // The escaping declaration must not become a file operation…
    expect(plan.files.map((f) => f.targetPath)).not.toContain(sentinel)
    // …and it must be VISIBLE, not silently dropped.
    expect(plan.conflicts.map((c) => c.path)).toContain('../sentinel.ts')

    // The end-to-end assertion: running the injection (forced, so no conflict
    // short-circuit hides it) leaves the outside file exactly as it was.
    await executeInjection(plan, project, { force: true })
    expect(readFileSync(sentinel, 'utf-8')).toBe('ORIGINAL')
  })

  it('still plans a config file that is inside the project (no over-tightening)', async () => {
    installPackage(project, '@molecule/api-middleware-good', {
      type: 'middleware',
      category: 'test',
      label: 'Good middleware',
      middlewareSetup: {
        configFile: 'src/tiers.ts',
        configTemplate: 'export const tiers = []\n',
        expression: 'createGood()',
      },
    })

    const plan = await planInjection('@molecule/api-middleware-good', project)
    expect(plan.conflicts.filter((c) => c.path === 'src/tiers.ts')).toEqual([])
    expect(plan.files.map((f) => f.targetPath)).toContain(join(project, 'src', 'tiers.ts'))

    await executeInjection(plan, project, { force: true })
    expect(readFileSync(join(project, 'src', 'tiers.ts'), 'utf-8')).toBe(
      'export const tiers = []\n',
    )
  })

  it('refuses a table whose SQL file is declared outside its own package', async () => {
    // Outside the PACKAGE (and outside the project): the read must not happen.
    const outsideSql = join(root, 'outside-secret.sql')
    writeFileSync(outsideSql, 'CREATE TABLE stolen (id serial primary key);')

    installPackage(project, '@molecule/api-resource-reader', {
      type: 'resource',
      category: 'test',
      label: 'Reader resource',
      tables: [{ name: 'stolen', sqlFile: '../../../../outside-secret.sql' }],
    })

    const plan = await planInjection('@molecule/api-resource-reader', project)

    expect(plan.migrations).toEqual([])
    expect(plan.migrationFailures?.[0]).toContain('stolen')

    await executeInjection(plan, project, { force: true })
    // The bytes outside the package were never copied into the project.
    expect(existsSync(join(project, 'migrations'))).toBe(false)
  })

  it('keeps a migration inside migrations/ when the table name carries separators', async () => {
    const pkgDir = installPackage(project, '@molecule/api-resource-evil', {
      type: 'resource',
      category: 'test',
      label: 'Evil resource',
      tables: [{ name: 'evil/../../pwn', sqlFile: 'sql/evil.sql' }],
    })
    mkdirSync(join(pkgDir, 'sql'), { recursive: true })
    writeFileSync(join(pkgDir, 'sql', 'evil.sql'), 'CREATE TABLE evil (id serial primary key);')

    const plan = await planInjection('@molecule/api-resource-evil', project)

    expect(plan.migrations).toHaveLength(1)
    // One path segment: the filename cannot address anything outside migrations/.
    const name = plan.migrations[0]!.name
    expect(name).not.toMatch(/[\\/]/)

    await executeInjection(plan, project, { force: true })
    expect(readdirSync(join(project, 'migrations'))).toEqual([name])
    // The uncontained write landed here (`migrations/…/../../pwn_table.sql`).
    expect(existsSync(join(project, 'pwn_table.sql'))).toBe(false)
  })
})
