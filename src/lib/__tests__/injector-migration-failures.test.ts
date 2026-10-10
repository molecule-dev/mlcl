/**
 * A resource whose SQL migration file cannot be read used to fail planning
 * with a bare `console.warn` — the migration silently dropped out of the
 * plan, the injection exited 0, and the resource's table was missing at
 * runtime ("relation … does not exist"). The unreadable SQL is now recorded
 * on the plan (`migrationFailures`) and the inject command fails the request
 * with it, the same policy an unresolvable package gets.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { planInjection } from '../injector.js'

const PKG_NAME = '@molecule/api-resource-broken'

describe('planInjection migration failures', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-migration-failure-'))
    const pkgDir = join(dir, 'node_modules', '@molecule', 'api-resource-broken')
    mkdirSync(join(pkgDir, 'sql'), { recursive: true })
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: PKG_NAME,
        version: '1.0.0',
        molecule: {
          type: 'resource',
          category: 'test',
          label: 'Broken resource',
          tables: [{ name: 'widgets', sqlFile: 'sql/widgets.sql' }],
        },
      }),
    )
    // sql/widgets.sql deliberately NOT written — the published package that
    // forgot to ship its sql/ directory (a `files` array can drop it too).
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('records an unreadable SQL file as a plan failure instead of dropping the migration silently', async () => {
    const plan = await planInjection(PKG_NAME, dir)

    // The migration must not appear plannable…
    expect(plan.migrations).toEqual([])
    // …and the failure must be on the plan for the command to surface.
    expect(plan.migrationFailures).toHaveLength(1)
    expect(plan.migrationFailures?.[0]).toContain('widgets')
  })

  it('plans the migration normally when the SQL file is readable', async () => {
    writeFileSync(
      join(dir, 'node_modules', '@molecule', 'api-resource-broken', 'sql', 'widgets.sql'),
      'CREATE TABLE widgets (id serial primary key);',
    )

    const plan = await planInjection(PKG_NAME, dir)

    expect(plan.migrationFailures ?? []).toEqual([])
    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.tableName).toBe('widgets')
  })
})
