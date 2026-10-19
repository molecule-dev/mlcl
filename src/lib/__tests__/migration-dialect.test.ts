/**
 * A scaffolded migration file has to say which database it runs on.
 *
 * The resource packages publish their setup SQL per table — usually one file
 * per table, sometimes one file for several (`articles.sql`) — in POSTGRES
 * dialect (`uuid`, `timestamptz`, `DEFAULT now()`, `gen_random_uuid()`), and the
 * non-Postgres bonds translate it as they apply each file — so the SQL is right
 * for every bond and the scaffold writes it verbatim. What the file does not
 * say is which database the app actually runs, and X1 flash-m69 read one in a
 * SQLite app, concluded it "cannot be used", and re-transcribed four packages'
 * schemas by hand (`gen_random_uuid() … which SQLite rejects`). The header these
 * tests pin is the scaffold's half of that fix: the app's database, the
 * constructs it rejects, and the fact that the published SQL below applies as
 * it is.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { planInjection } from '../injector.js'
import {
  DATABASE_DIALECTS,
  databasePackageOf,
  dialectOfDatabasePackage,
  migrationDialectHeader,
  projectDatabasePackage,
  stampMigrationDialect,
} from '../migration-dialect.js'
import { loadRegistry } from '../registry.js'
import { copySqlSetupScripts, copyTemplateDomainFiles, copyTemplateInstance } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

const SQLITE = '@molecule/api-database-sqlite'
const MYSQL = '@molecule/api-database-mysql'
const POSTGRES = '@molecule/api-database-postgresql'
const PGLITE = '@molecule/api-database-pglite'

let dir: string | null = null
afterEach(async () => {
  vi.restoreAllMocks()
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('migrationDialectHeader', () => {
  it('names the app database, what it rejects, and that the package SQL applies as it is', () => {
    const header = migrationDialectHeader(SQLITE)
    // A SQL comment: the file is still the migration SQL, so every line is a comment.
    for (const line of header.trimEnd().split('\n')) expect(line.startsWith('--')).toBe(true)
    expect(header).toContain(SQLITE)
    expect(header).toContain('SQLite')
    // The constructs the SQLite bond's translator exists for.
    expect(header).toContain('gen_random_uuid()')
    expect(header).toContain('current_timestamp')
    // The half the flash-m69 model got wrong: the published file is copied as-is.
    expect(header).toMatch(/never hand-write a SQLite version/i)
    // …and the half it must NOT be told: `uuid`/`timestamptz` are fine on SQLite, so
    // a header claiming otherwise would send it rewriting working scaffolded SQL
    // (the flash-m60 defect the dialect note's own comment records).
    expect(header).toContain('uuid')
    expect(header).toContain('timestamptz')
    expect(header).toMatch(/plain type names/)
  })

  it('says MySQL is strict about the types and indexes it rejects', () => {
    const header = migrationDialectHeader(MYSQL)
    expect(header).toContain(MYSQL)
    expect(header).toContain('MySQL')
    expect(header).toMatch(/never hand-write a MySQL version/i)
  })

  it('is empty where the published dialect IS the app dialect', () => {
    // Postgres and PGlite run the dialect the packages are published in — every
    // flagship template would otherwise carry a header on every migration file
    // telling the agent nothing it needs.
    expect(migrationDialectHeader(POSTGRES)).toBe('')
    expect(migrationDialectHeader(PGLITE)).toBe('')
    expect(migrationDialectHeader('@molecule/api-not-a-database')).toBe('')
    expect(migrationDialectHeader(null)).toBe('')
  })

  it('does not promise a translation to the one SQLite database that has none (D1)', () => {
    // D1 is Cloudflare's SQLite and it is the only provider with no in-app
    // migrator — its files are applied with `wrangler d1 migrations apply`, so
    // "the bond rewrites it as it applies this file" would be false there and
    // would send the agent to copy Postgres DDL nothing translates.
    const header = migrationDialectHeader('@molecule/api-database-d1')
    expect(header).not.toBe('')
    expect(header).toMatch(/out of band/i)
    expect(header).not.toContain('rewritten')
    expect(header).not.toContain('bonds rewrites as it applies')
    expect(header).toContain('write its columns as SQLite DDL')
  })
})

describe('dialectOfDatabasePackage', () => {
  it('maps PGlite to Postgres (it is Postgres in wasm) and D1 to SQLite', () => {
    expect(dialectOfDatabasePackage(PGLITE)).toBe('postgresql')
    expect(dialectOfDatabasePackage('@molecule/api-database-d1')).toBe('sqlite')
    expect(dialectOfDatabasePackage(null)).toBeNull()
  })

  it('covers every database provider the registry declares', () => {
    const dbProviders = loadRegistry('api')
      .filter((p) => p.molecule?.category === 'database' && p.type === 'provider')
      .map((p) => p.name)
    expect(dbProviders.length).toBeGreaterThan(0)
    // A provider added without a dialect ships scaffolded SQL written for the
    // wrong database, silently — the same coverage rule the migrate-runner
    // provider list is held to.
    expect(dbProviders.filter((name) => !DATABASE_DIALECTS.has(name))).toEqual([])
  })
})

describe('databasePackageOf', () => {
  it('prefers the non-Postgres bond of a mixed set, and finds a lone one', () => {
    expect(databasePackageOf([SQLITE, POSTGRES])).toBe(SQLITE)
    expect(databasePackageOf([POSTGRES])).toBe(POSTGRES)
    expect(databasePackageOf(['@molecule/api-resource-article'])).toBeNull()
  })
})

describe('projectDatabasePackage', () => {
  it('reads both dependency keys of the app manifest', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-dialect-'))
    const api = join(dir, 'api')
    await mkdir(api)
    // `mlcl swap` lands the database in whichever key the old one occupied, so a
    // devDependencies-pinned one is the app's real database too.
    await writeFile(
      join(api, 'package.json'),
      JSON.stringify({ devDependencies: { [SQLITE]: '1.2.3' } }),
    )
    expect(await projectDatabasePackage(api)).toBe(SQLITE)
    await rm(join(api, 'package.json'))
    expect(await projectDatabasePackage(api)).toBeNull()
  })
})

describe('the scaffold writes migrations in the bonded dialect', () => {
  /** A resource package shipping one setup SQL, laid out like the published ones. */
  const resourcePackage = async (path: string): Promise<InferredPackage> => {
    await mkdir(join(path, 'src', '__setup__'), { recursive: true })
    await writeFile(
      join(path, 'src', '__setup__', 'demo.sql'),
      'CREATE TABLE IF NOT EXISTS "demo" (\n  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid()\n);\n',
    )
    return {
      name: '@molecule/api-demo',
      version: '1.0.0',
      type: 'resource' as never,
      dependencies: {},
      peerDependencies: {},
      routes: [],
      tables: [{ name: 'demo', sqlFile: 'src/__setup__/demo.sql' }],
      exports: [],
      path,
      molecule: {} as never,
    }
  }

  it('precedes a setup script with the header of the bond the app declares', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-dialect-copy-'))
    const projectPath = join(dir, 'app')
    await mkdir(join(projectPath, '__setup__'), { recursive: true })
    const pkg = await resourcePackage(join(dir, 'pkgs', 'demo'))

    await copySqlSetupScripts(projectPath, [pkg.name, SQLITE], [pkg])
    const written = await readFile(join(projectPath, '__setup__', 'demo.sql'), 'utf8')
    expect(migrationDialectHeader(SQLITE)).not.toBe('')
    expect(written.startsWith(migrationDialectHeader(SQLITE))).toBe(true)
    // The DDL itself is untouched — the bond translates it as it applies.
    expect(written).toContain('DEFAULT gen_random_uuid()')

    // A Postgres app's copy is the published file, byte for byte.
    const pgProject = join(dir, 'pg')
    await mkdir(join(pgProject, '__setup__'), { recursive: true })
    await copySqlSetupScripts(pgProject, [pkg.name, POSTGRES], [pkg])
    expect(await readFile(join(pgProject, '__setup__', 'demo.sql'), 'utf8')).not.toContain('--')
  })
})

/**
 * The injector's own migration writer, driven against a real registry package —
 * the file X1 flash-m69 opened and read as broken. Only a workspace checkout has
 * the molecule tree beside mlcl; a standalone clone has nothing to inject.
 */
const ARTICLE = '@molecule/api-resource-article'
const ARTICLE_PATH = loadRegistry('api').find((p) => p.name === ARTICLE)?.path
const HAVE_MOLECULE_TREE = ARTICLE_PATH !== undefined && existsSync(ARTICLE_PATH)

describe.runIf(HAVE_MOLECULE_TREE)('an injected resource migration names the app database', () => {
  /** The migrations `mlcl inject` plans for a project declaring `database`. */
  const planned = async (projectPath: string): Promise<string[]> => {
    const plan = await planInjection(ARTICLE, projectPath)
    expect(plan.conflicts).toEqual([])
    return plan.migrations.map((m) => m.content)
  }

  const project = async (name: string, database: string): Promise<string> => {
    const path = join(dir as string, name)
    await mkdir(path, { recursive: true })
    await writeFile(
      join(path, 'package.json'),
      JSON.stringify({ dependencies: { [ARTICLE]: '1.0.5', [database]: '1.0.0' } }),
    )
    return path
  }

  it('leads a SQLite project’s migration with the SQLite dialect header', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-dialect-inject-'))
    // Asserted non-empty first: `startsWith('')` is true, so an empty header would
    // pass the loop below without a header ever being written.
    expect(migrationDialectHeader(SQLITE)).not.toBe('')
    const contents = await planned(await project('sqlite-app', SQLITE))
    expect(contents.length).toBeGreaterThan(0)
    for (const content of contents) {
      expect(content.startsWith(migrationDialectHeader(SQLITE))).toBe(true)
      expect(content).toContain(SQLITE)
      // The package's published DDL is still the whole body: the bond translates it.
      expect(content).toContain('gen_random_uuid()')
    }
  })

  it('leaves a Postgres project’s migration as the package publishes it', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-dialect-inject-pg-'))
    const contents = await planned(await project('pg-app', POSTGRES))
    expect(contents.length).toBeGreaterThan(0)
    // No header is prepended: every migration is one of the package's own SQL
    // files, byte for byte. (StartsWith('CREATE TABLE') stopped being a proxy for
    // that once one SQL file began with a `--` comment — and one file now serves
    // several tables, so `articles_position.sql` is planned as itself.)
    const setupDir = join(ARTICLE_PATH as string, 'src', '__setup__')
    const published = await Promise.all(
      (await readdir(setupDir))
        .filter((file) => file.endsWith('.sql'))
        .map((file) => readFile(join(setupDir, file), 'utf-8')),
    )
    for (const content of contents) expect(published).toContain(content)
  })
})

describe('stampMigrationDialect', () => {
  /** Postgres-dialect DDL of the shape every flagship template's migrations carry. */
  const USERS_SQL =
    'CREATE TABLE IF NOT EXISTS "users" (\n' +
    '  "id" uuid UNIQUE PRIMARY KEY NOT NULL,\n' +
    '  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL\n' +
    ');\n'

  it('prepends the header to every .sql in the directory, and nothing else', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-stamp-'))
    const migrations = join(dir, 'api', 'migrations')
    await mkdir(migrations, { recursive: true })
    await writeFile(join(migrations, '1777_create_users_table.sql'), USERS_SQL)
    await writeFile(join(migrations, 'README.md'), 'not a migration\n')

    const stamped = await stampMigrationDialect(migrations, SQLITE)

    expect(stamped).toBe(1)
    const written = await readFile(join(migrations, '1777_create_users_table.sql'), 'utf8')
    expect(written).toBe(`${migrationDialectHeader(SQLITE)}${USERS_SQL}`)
    // A migration describes the database it ran on, so the header is a SQL comment.
    expect(written.split('\n').at(-2)).toBe(');')
    expect(await readFile(join(migrations, 'README.md'), 'utf8')).toBe('not a migration\n')
  })

  it('does nothing for a Postgres app, whose migrations are already its dialect', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-stamp-pg-'))
    const migrations = join(dir, 'api', 'migrations')
    await mkdir(migrations, { recursive: true })
    await writeFile(join(migrations, '1777_create_users_table.sql'), USERS_SQL)

    expect(await stampMigrationDialect(migrations, POSTGRES)).toBe(0)
    expect(await readFile(join(migrations, '1777_create_users_table.sql'), 'utf8')).toBe(USERS_SQL)
  })

  it('cannot stack two headers on a file a previous run stamped', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-stamp-idem-'))
    const migrations = join(dir, 'api', 'migrations')
    await mkdir(migrations, { recursive: true })
    await writeFile(join(migrations, '1777_create_users_table.sql'), USERS_SQL)

    expect(await stampMigrationDialect(migrations, SQLITE)).toBe(1)
    expect(await stampMigrationDialect(migrations, SQLITE)).toBe(0)
    const written = await readFile(join(migrations, '1777_create_users_table.sql'), 'utf8')
    expect(written).toBe(`${migrationDialectHeader(SQLITE)}${USERS_SQL}`)
  })

  it('is not an error when the app has no migrations directory', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-stamp-none-'))
    expect(await stampMigrationDialect(join(dir, 'api', 'migrations'), SQLITE)).toBe(0)
  })
})

/**
 * A template the fast path can copy: the minimum `copyTemplateInstance` walks
 * (`app/package.json` decides it takes the fast path), plus the Postgres-dialect
 * `api/migrations/*.sql` a flagship ships. Mirrors the fixture in
 * `scaffold-template-copy-guards.test.ts`.
 */
async function makeTemplateInstance(
  database: string,
): Promise<{ templateDir: string; destDir: string }> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-template-dialect-'))
  const templatesDir = join(dir, 'templates')
  const templateDir = join(templatesDir, 'apps', 'fixture-app')
  const destDir = join(dir, 'project')
  await mkdir(join(templateDir, 'app', 'src'), { recursive: true })
  await mkdir(join(templateDir, 'api', 'migrations'), { recursive: true })
  await mkdir(join(templatesDir, 'shared', 'fonts'), { recursive: true })

  await writeFile(
    join(templateDir, 'package.json'),
    JSON.stringify({ name: 'fixture-app', private: true, workspaces: ['api', 'app'] }, null, 2),
  )
  await writeFile(
    join(templateDir, 'api', 'package.json'),
    JSON.stringify({ name: 'fixture-api', dependencies: { [database]: '1.0.0' } }),
  )
  await writeFile(join(templateDir, 'app', 'package.json'), JSON.stringify({ name: 'fixture-app' }))
  await writeFile(join(templateDir, '.gitignore'), 'node_modules\n.env*\n!.env.example\n')
  await writeFile(
    join(templateDir, 'app', 'index.html'),
    '<html><head><title>fixture-app</title></head><body></body></html>',
  )
  await writeFile(
    join(templateDir, 'app', 'src', 'branding.ts'),
    "export const APP_NAME = 'Fixture'\nexport const APP_DESCRIPTION = 'fixture'\n",
  )
  await writeFile(join(templateDir, 'fonts.json'), '[]')
  await writeFile(
    join(templateDir, 'api', 'migrations', '1777471797397_create_users_table.sql'),
    'CREATE TABLE IF NOT EXISTS "users" (\n' +
      '  "id" uuid UNIQUE PRIMARY KEY NOT NULL,\n' +
      '  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL\n' +
      ');\n',
  )
  return { templateDir, destDir }
}

describe('the template fast path stamps the migrations it copies', () => {
  it('names the app database on a SQLite app’s migration, leaving the DDL as it is', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { templateDir, destDir } = await makeTemplateInstance(SQLITE)

    await copyTemplateInstance(templateDir, destDir, 'my-project')

    const copied = await readFile(
      join(destDir, 'api', 'migrations', '1777471797397_create_users_table.sql'),
      'utf8',
    )
    // The file X1 flash-m69 opened, read as the convention to follow, and copied
    // into its own hand-written schema (+05:14) now says which database it runs on.
    expect(copied.startsWith(migrationDialectHeader(SQLITE))).toBe(true)
    expect(copied).toContain('current_timestamp')
    expect(copied).toContain('uuid')
  })

  it('leaves a Postgres app’s migration as the template ships it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { templateDir, destDir } = await makeTemplateInstance(POSTGRES)

    await copyTemplateInstance(templateDir, destDir, 'my-project')

    const copied = await readFile(
      join(destDir, 'api', 'migrations', '1777471797397_create_users_table.sql'),
      'utf8',
    )
    expect(copied.startsWith('CREATE TABLE')).toBe(true)
  })
})

describe('copyTemplateDomainFiles stamps the migrations it copies', () => {
  it('leads a SQLite app’s migration with the SQLite header', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-domain-dialect-'))
    const cliRoot = join(dir, 'cli')
    const templateDir = join(cliRoot, 'templates', 'apps', 'fixture-app')
    const appPath = join(dir, 'project', 'app')
    const apiPath = join(dir, 'project', 'api')
    await mkdir(join(templateDir, 'api', 'migrations'), { recursive: true })
    await mkdir(apiPath, { recursive: true })
    await mkdir(appPath, { recursive: true })
    await writeFile(
      join(templateDir, 'api', 'migrations', '0010_fixture_tables.sql'),
      'CREATE TABLE IF NOT EXISTS "fixture" (\n  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid()\n);\n',
    )
    await writeFile(
      join(apiPath, 'package.json'),
      JSON.stringify({ name: 'fixture-api', dependencies: { [SQLITE]: '1.0.0' } }),
    )

    await copyTemplateDomainFiles('fixture-app', 'react', appPath, apiPath, cliRoot)

    const copied = await readFile(join(apiPath, 'migrations', '0010_fixture_tables.sql'), 'utf8')
    expect(copied.startsWith(migrationDialectHeader(SQLITE))).toBe(true)
    expect(copied).toContain('gen_random_uuid()')
  })
})
