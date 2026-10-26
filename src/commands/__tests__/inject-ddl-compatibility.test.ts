/**
 * `mlcl inject` refuses a database bond that cannot apply the setup SQL the
 * project's packages ship — BEFORE it writes anything.
 *
 * The generated `server.ts` awaits `runMigrations()`, so a DuckDB project with
 * a resource package whose `src/__setup__/*.sql` uses a foreign-key referential
 * action or a partial index is not a degraded app: its API never starts. The
 * install path already exists whenever a user adds a package; this is the gate
 * that makes the failure immediate, named and actionable instead of a boot
 * crash discovered later — and it must not leave a half-injected project
 * behind.
 *
 * Runs the REAL oclif command against a temp project.
 *
 * @module
 */

import { cpSync, existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DDL_INCOMPATIBLE_EXIT } from '../../lib/ddl-exit.js'
import { loadRegistry } from '../../lib/registry.js'
import Inject from '../inject.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const DUCKDB = '@molecule/api-database-duckdb'
const POSTGRESQL = '@molecule/api-database-postgresql'
// `comments.sql` creates `parentId … REFERENCES "comments"("id") ON DELETE
// CASCADE` — one of the 21 resource packages whose setup SQL DuckDB rejects.
const COMMENT = '@molecule/api-resource-comment'
// A plain-partial-index package DuckDB's bond translates: safe to select.
const ADDRESS = '@molecule/api-resource-address'
// A transitive molecule peer that pins itself into a manifest without anyone
// selecting it — its setup SQL is never copied into `__setup__/`.
const WORKFLOW = '@molecule/api-workflow-database'

// The provider declarations come from the CHECKED-IN registry — the wave's
// `delta/registry-sql-capabilities.json`, generated from each bond's own
// `src/capabilities.ts`. No hand-copied map: the preflight fails closed without
// the delta, and that failure is the honest one.

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/** The version of the real source copy used by these compatibility fixtures. */
async function fixtureVersion(name: string): Promise<string> {
  const entry = loadRegistry().find((pkg) => pkg.name === name)
  if (!entry || !existsSync(entry.path)) throw new Error(`Missing fixture source: ${name}`)
  const manifest = JSON.parse(await readFile(join(entry.path, 'package.json'), 'utf-8')) as {
    version: string
  }
  return manifest.version
}

/** An api project on `database`, with `@molecule/api-resource-comment` declared. */
async function writeApiProject(
  database: string,
  options: {
    dependencies?: Record<string, string>
    setupSql?: Record<string, string>
    migrations?: Record<string, string>
    /** Set false for a manifest that does NOT declare resource-comment. */
    comment?: boolean
  } = {},
): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-ddl-'))
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          [database]: await fixtureVersion(database),
          ...(options.comment === false ? {} : { [COMMENT]: await fixtureVersion(COMMENT) }),
          ...options.dependencies,
        },
      },
      null,
      2,
    ) + '\n',
  )
  for (const [subdir, files] of [
    ['__setup__', options.setupSql],
    ['migrations', options.migrations],
  ] as const) {
    if (!files) continue
    await mkdir(join(dir, subdir), { recursive: true })
    for (const [name, sql] of Object.entries(files)) {
      await writeFile(join(dir, subdir, name), sql)
    }
  }
  return dir
}

/** The SQL the runner replays: a foreign key DuckDB cannot honour. */
const CASCADE_SQL =
  'CREATE TABLE posts (\n  id UUID PRIMARY KEY,\n' +
  '  parent_id UUID REFERENCES posts (id) ON DELETE CASCADE\n);\n'

/**
 * Run the real command, capturing everything it prints (clack writes to
 * stdout, not through `this.log`).
 *
 * @param projectPath - The project to inject into.
 * @param molecule - The `-m` package, or null for a HOLISTIC run (no flag).
 * @param pathArg - What `-p` receives (defaults to `projectPath`; tests pass a
 *   relative form to pin the resolver's absolute anchoring).
 * @returns The thrown outcome (null on success) and the captured output.
 */
async function runInject(
  projectPath: string,
  molecule: string | null,
  pathArg: string = projectPath,
): Promise<{ outcome: unknown; output: string }> {
  const config = await Config.load(MLCL_ROOT)
  const args = [
    ...(molecule ? ['-m', molecule] : []),
    '-p',
    pathArg,
    '--no-install',
    '--no-test',
    '--no-format',
    '--no-ai',
  ]
  const cmd = new Inject(args, config)
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  try {
    await cmd.run()
    return { outcome: null, output: write.mock.calls.map((call) => String(call[0])).join('') }
  } catch (error) {
    return { outcome: error, output: write.mock.calls.map((call) => String(call[0])).join('') }
  } finally {
    write.mockRestore()
  }
}

/**
 * Install a copy of a real molecule package into a project's node_modules, as a
 * fleet/`npm install` would, optionally at another version or with replaced SQL.
 *
 * @param projectPath - The project whose `node_modules` receives it.
 * @param name - The `@molecule/*` package to copy from the molecule source.
 * @param options - Version override and setup-file replacement.
 * @param options.version - Version to declare in the copied package.json.
 * @param options.sql - `{ file, text }` written into `src/__setup__/`.
 * @returns The installed package root.
 */
async function installPackage(
  projectPath: string,
  name: string,
  options: { version?: string; sql?: { file: string; text: string } } = {},
): Promise<string> {
  const entry = loadRegistry().find((pkg) => pkg.name === name)
  if (!entry || !existsSync(entry.path))
    throw new Error(`${name} is not in the molecule source tree`)
  const target = join(projectPath, 'node_modules', name)
  cpSync(entry.path, target, { recursive: true })
  const manifestPath = join(target, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as { version?: string }
  if (options.version) manifest.version = options.version
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  if (options.sql) {
    await mkdir(join(target, 'src', '__setup__'), { recursive: true })
    await writeFile(join(target, 'src', '__setup__', options.sql.file), options.sql.text)
  }
  return target
}

describe('mlcl inject — setup-SQL compatibility preflight', () => {
  it('refuses a DuckDB project before writing anything, naming package, file and construct', async () => {
    const project = await writeApiProject(DUCKDB)
    const { outcome, output } = await runInject(project, COMMENT)

    // The command exits non-zero (oclif's ExitError) instead of reporting a
    // green inject over an app whose boot migrations cannot apply.
    expect(outcome).toBeDefined()
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit, output).toBe(
      DDL_INCOMPATIBLE_EXIT,
    )
    expect(output).toContain(DUCKDB)
    expect(output).toMatch(/cannot run this project's database setup/)
    // The refusal names the bytes this run would WRITE (the planned migration),
    // which is what the runner replays — not a second resolution of the package.
    expect(output).toContain(COMMENT)
    expect(output).toMatch(/_create_comments?_table\.sql/)
    expect(output).toContain('ON DELETE CASCADE')
    // Nothing was generated: no bond file, no wiring, no migration.
    expect(await readdir(join(project, 'src'))).toEqual([])
  })

  it('does not refuse the same package on a database that applies its SQL', async () => {
    // Control: identical project and package, only the database differs. The
    // refusal must come from the SQL/database combination — never from the
    // package existing at all.
    const project = await writeApiProject(POSTGRESQL)
    const { output } = await runInject(project, COMMENT)
    expect(output).not.toContain("cannot run this project's database setup")
  })

  it('does not judge a transitive peer whose SQL was never copied into the project', async () => {
    // `mlcl create` closes a manifest over the registry's molecule peers, so a
    // DuckDB app carries pins nobody selected (`api-workflow-database` ships an
    // `ON DELETE CASCADE` schema). Judging every manifest key refused every
    // later inject over SQL this project will never replay, and no command could
    // clear it. The judged set is the SQL on disk plus the packages THIS run
    // adds.
    const project = await writeApiProject(DUCKDB, {
      dependencies: {
        [ADDRESS]: await fixtureVersion(ADDRESS),
        [WORKFLOW]: await fixtureVersion(WORKFLOW),
      },
    })
    const { outcome, output } = await runInject(project, ADDRESS)
    expect(output).not.toContain("cannot run this project's database setup")
    expect(
      (outcome as { oclif?: { exit?: number } } | undefined)?.oclif?.exit,
      output,
    ).toBeUndefined()
  })

  it('refuses setup SQL the runner WILL replay from the project’s own __setup__ copy', async () => {
    // The create-time copy is what the generated runner applies at boot, so it
    // is judged even though no manifest key carries it any more.
    const project = await writeApiProject(DUCKDB, {
      dependencies: { [ADDRESS]: await fixtureVersion(ADDRESS) },
      setupSql: { 'posts.sql': CASCADE_SQL },
    })
    const { outcome, output } = await runInject(project, ADDRESS)
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit, output).toBe(
      DDL_INCOMPATIBLE_EXIT,
    )
    expect(output).toContain(DUCKDB)
    expect(output).toContain('__setup__/posts.sql')
    expect(output).toContain('ON DELETE CASCADE')
    // Nothing generated.
    expect(await readdir(join(project, 'src'))).toEqual([])
  })

  it('refuses the app’s own migrations the same way', async () => {
    const project = await writeApiProject(DUCKDB, {
      dependencies: { [ADDRESS]: await fixtureVersion(ADDRESS) },
      migrations: { '0001_posts.sql': CASCADE_SQL },
    })
    const { outcome, output } = await runInject(project, ADDRESS)
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit, output).toBe(
      DDL_INCOMPATIBLE_EXIT,
    )
    expect(output).toContain('migrations/0001_posts.sql')
    expect(output).toContain('ON DELETE CASCADE')
  })

  it('does not judge a transitive peer on a HOLISTIC run (no -m) either', async () => {
    // `findPendingMolecules` returns EVERY `@molecule/*` manifest key, so a
    // bare `mlcl inject` used to pass all of them to the preflight — including a
    // transitive bond peer whose declared setup SQL (`workflow.sql`) is in
    // neither `__setup__/` nor `migrations/` and is replayed by nothing. On
    // DuckDB that refused every later inject, and no command could clear it.
    //
    // This is the DEFAULT invocation an operator runs after `mlcl add`, and it
    // is driven here with no `-m`: the supported resource's own SQL may be
    // written by this run (so it is judged), the peer's may not (so it is not).
    const project = await writeApiProject(DUCKDB, {
      dependencies: {
        [ADDRESS]: await fixtureVersion(ADDRESS),
        [WORKFLOW]: await fixtureVersion(WORKFLOW),
      },
      comment: false,
    })
    const { outcome, output } = await runInject(project, null)
    expect(output).not.toContain("cannot run this project's database setup")
    expect(
      (outcome as { oclif?: { exit?: number } } | undefined)?.oclif?.exit,
      output,
    ).toBeUndefined()
    // The on-disk SQL a boot WILL replay is still judged on this path.
    expect(output).not.toContain('bundles no setup SQL')
  })

  it('refuses replayed unsupported SQL on a HOLISTIC run (no -m)', async () => {
    // The other half of the same rule: `workflow.sql` ON DISK is what the runner
    // replays, so it is judged regardless of which manifest key names it.
    const project = await writeApiProject(DUCKDB, {
      dependencies: {
        [ADDRESS]: await fixtureVersion(ADDRESS),
        [WORKFLOW]: await fixtureVersion(WORKFLOW),
      },
      setupSql: { 'workflow.sql': CASCADE_SQL },
      comment: false,
    })
    const { outcome, output } = await runInject(project, null)
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit, output).toBe(
      DDL_INCOMPATIBLE_EXIT,
    )
    expect(output).toContain('__setup__/workflow.sql')
    expect(output).toContain('ON DELETE CASCADE')
    // Nothing generated.
    expect(await readdir(join(project, 'src'))).toEqual([])
  })

  it('judges the bytes it WRITES, not another copy — even with a relative -p (F7)', async () => {
    // The injector reads the package it resolved and writes its SQL as a
    // migration. A second resolution inside the preflight used to judge the
    // BUNDLE (a relative `-p` made `createRequire` throw, so every install was
    // invisible) while the installed copy — here one already carrying an
    // unsupported cascade — was what got written. Judging the planned contents
    // closes that gap; the relative path is the exact shape that hid it.
    const project = await writeApiProject(DUCKDB, {
      dependencies: { [ADDRESS]: await fixtureVersion(ADDRESS) },
      comment: false,
    })
    await installPackage(project, ADDRESS, {
      version: await fixtureVersion(ADDRESS),
      sql: { file: 'addresses.sql', text: CASCADE_SQL },
    })
    const { outcome, output } = await runInject(project, ADDRESS, relative(process.cwd(), project))
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit, output).toBe(
      DDL_INCOMPATIBLE_EXIT,
    )
    expect(output).toContain('ON DELETE CASCADE')
    // Nothing was written.
    expect(await readdir(join(project, 'src'))).toEqual([])
    expect(existsSync(join(project, 'migrations'))).toBe(false)
  })

  it('writes the setup SQL of an explicitly selected non-resource package (F10)', async () => {
    // `planResourceInjection` is the only planner that emits migrations, so a
    // bond/feature with `tables` used to be judged but copied NOWHERE — its
    // tables never existed. An explicitly selected package is now resolved
    // through the shared resolver, judged with everything else, and written into
    // `__setup__/` (the step the runner replays) after the preflight passes.
    const project = await writeApiProject(POSTGRESQL, {
      dependencies: { [WORKFLOW]: await fixtureVersion(WORKFLOW) },
      comment: false,
    })
    await installPackage(project, WORKFLOW, { version: await fixtureVersion(WORKFLOW) })
    const { outcome, output } = await runInject(project, WORKFLOW)
    expect(
      (outcome as { oclif?: { exit?: number } } | undefined)?.oclif?.exit,
      output,
    ).toBeUndefined()
    expect(output).not.toContain("cannot run this project's database setup")
    const written = await readFile(join(project, '__setup__', 'workflow.sql'), 'utf-8')
    expect(written).toContain('CREATE TABLE')
  })
})
