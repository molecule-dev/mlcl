/**
 * The database project skill's migration example is the table a coding agent copies. It named
 * the file `0010_create_todos.sql`, which sorts before the scaffold's own `<scaffold time>_…`
 * migrations (so on Postgres a reference to `users` fails), created `user_id`/`created_at` while
 * the skill's CRUD example writes `userId`/`createdAt`, and declared no foreign key or CHECK: in
 * harness smoke runs 3 and 4 (2026-11-27/28) claude-molecule's tables had neither, copied from
 * that shape, and a blind review ranked the schema its top problem. This applies the example as
 * the skill says to (named with the current time, after a scaffold's `users` migration) through
 * the SQLite bond, and writes rows the way the CRUD example does.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { PROJECT_SKILLS_DIR } from '../agent-skills.js'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const skill = readFileSync(
  join(MLCL, 'templates', PROJECT_SKILLS_DIR, 'database', 'SKILL.md'),
  'utf8',
)
// The users table as a scaffold creates it: the user resource's own setup SQL, which its
// published package ships (`files` names src/__setup__). Its exports map leaves out
// `./package.json`, so the package root is found from its entry.
let userPackage = dirname(fileURLToPath(import.meta.resolve('@molecule/api-resource-user')))
while (!existsSync(join(userPackage, 'package.json'))) userPackage = dirname(userPackage)
const usersSql = readFileSync(join(userPackage, 'src', '__setup__', 'users.sql'), 'utf8')

let root: string | null = null
afterEach(() => {
  vi.unstubAllEnvs()
  if (root) rmSync(root, { recursive: true, force: true })
  root = null
})

/**
 * The example migration: the file name its first line gives (a `<…>` placeholder filled the way
 * it says, with the current time in milliseconds) and the SQL.
 *
 * @returns The file name and the SQL.
 */
function exampleMigration(): { name: string; sql: string } {
  const block = /```sql\n(-- api\/migrations\/((?:<[^>]*>|[^\s<])+?\.sql)[^\n]*\n[\s\S]*?)```/.exec(
    skill,
  )
  expect(block, 'the skill has a migration example').not.toBeNull()
  const name = block![2]!.replace(/<[^>]+>/, String(Date.now()))
  return { name, sql: block![1]! }
}

/**
 * The columns the CRUD example's `create('todos', { … })` writes.
 *
 * @returns The column names.
 */
function crudColumns(): string[] {
  const create = /create<\w+>\('todos', \{([\s\S]*?)\}\)/.exec(skill)
  expect(create, 'the skill has a create example').not.toBeNull()
  return create![1]!
    .split('\n')
    .map((line) => /^\s*(\w+)[,:]/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name))
}

describe('the database skill migration example', () => {
  it('sorts after the migrations a scaffold already has', () => {
    // The scaffold names its own migrations with the time it ran (mlcl's injector, Date.now()).
    // One name, read once: each read stamps the current time, and two reads a millisecond apart
    // differ.
    const scaffolded = `${Date.now() - 60_000}_create_users_table.sql`
    const example = exampleMigration().name
    expect([example, scaffolded].sort()).toEqual([scaffolded, example])
  })

  it('creates the columns the CRUD example writes, and enforces its foreign key and CHECK', async () => {
    root = mkdtempSync(join(tmpdir(), 'mlcl-skill-migration-'))
    const migrations = join(root, 'migrations')
    mkdirSync(migrations)
    writeFileSync(join(migrations, `${Date.now() - 60_000}_create_users_table.sql`), usersSql)
    const example = exampleMigration()
    writeFileSync(join(migrations, example.name), example.sql)
    vi.stubEnv('SQLITE_PATH', join(root, 'app.db'))

    const sqlite = await import('@molecule/api-database-sqlite')
    await sqlite.createMigrator(migrations)()
    const pool = sqlite.createPool()
    try {
      const userId = '00000000-0000-4000-8000-000000000001'
      await pool.query(`INSERT INTO "users" ("id", "email") VALUES ($1, 'a@example.com')`, [userId])
      const values: Record<string, unknown> = {
        title: 'Buy milk',
        userId,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      const columns = crudColumns()
      expect(columns.sort()).toEqual(Object.keys(values).sort())
      const insert = (row: Record<string, unknown>): Promise<unknown> =>
        pool.query(
          `INSERT INTO "todos" (${Object.keys(row)
            .map((column) => `"${column}"`)
            .join(', ')}) VALUES (${Object.keys(row)
            .map((_column, index) => `$${index + 1}`)
            .join(', ')})`,
          Object.values(row).map((value) => (typeof value === 'boolean' ? Number(value) : value)),
        )

      await insert(values)
      await expect(
        insert({ ...values, userId: '00000000-0000-4000-8000-0000000000ff' }),
      ).rejects.toThrow(/FOREIGN KEY constraint failed/)
      await expect(insert({ ...values, priority: 'urgent' })).rejects.toThrow(
        /CHECK constraint failed/,
      )
    } finally {
      await pool.end()
    }
  })
})
